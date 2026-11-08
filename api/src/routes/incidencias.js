const router = require('express').Router();
const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const AUDIO_EXT_PERMITIDAS = ['.m4a', '.aac', '.ogg', '.wav', '.mp3', '.opus'];
const UPLOAD_AUDIO_DIR = path.join(__dirname, '..', '..', 'uploads', 'incidencias');

// Limpia el relleno del ERP (tabs y espacios repetidos) en las descripciones.
// Los emojis y acentos se conservan (la conexion es utf8mb4).
function limpiarDesc(s) {
  if (!s) return s;
  return s.replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
}

// ============================================================
// GPS DE VISITAS
// - La app (movil) captura la ubicacion al registrar la visita y
//   la envia en el POST (lat/lng/precision + fecha de captura).
// - Al EDITAR (PUT) NO se captura ni se toca ninguna coordenada.
// - cliente_ubicaciones guarda el punto de referencia del cliente
//   SOLO cuando el vendedor confirma (flag actualizar_cliente).
//   Confirma el punto nuevo la primera vez o cuando la diferencia
//   supera el umbral (configurable: configgps / por cliente).
// ============================================================

const CAMPOS_GPS = 'i.inc_lat, i.inc_lng, i.inc_gps_acc, i.inc_gps_fec';

// Valida y normaliza el bloque de coordenadas del body.
// Devuelve {lat, lng, acc} o null si no vienen coords.
function coordsDelBody(body) {
  const lat = Number(body.inc_lat);
  const lng = Number(body.inc_lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const acc = Number(body.inc_gps_acc);
  return { lat, lng, acc: Number.isFinite(acc) ? Math.min(Math.max(Math.round(acc), 0), 99999) : null };
}

// distancia entre dos puntos (metros), formula haversine
function distanciaMetro(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Config global: { umbral_global, umbral_tope } en metros (valores numericos)
async function configGps() {
  const [rows] = await pool.query('SELECT clave, valor FROM config_gps');
  const mapa = {};
  rows.forEach((r) => { mapa[r.clave] = r.valor; });
  return {
    umbral_global: Number(mapa.umbral_global) || 300,
    umbral_tope: Number(mapa.umbral_tope) || 2000
  };
}

// ============================================================
// INCIDENCIAS
// - 'incidencias.ver_todas' (admin/empleado) => ve las de todos.
// - Sin el permiso (vendedor) => solo las propias (use_emno).
// - Se puede crear ligada a un cliente (ter_cote) o independiente.
// ============================================================

// Historial de incidencias
// GET /api/incidencias
//   ?cliente=XXXX        filtrar por cliente
//   ?desde=YYYY-MM-DD    desde una fecha (fe_regi)
//   ?hasta=YYYY-MM-DD    hasta una fecha (fe_regi)
//   ?q=texto             buscar por nombre de cliente o vendedor
//   ?independientes=1    solo sin cliente
router.get('/', async (req, res) => {
  try {
    const puedeTodas = req.user.permisos && req.user.permisos.includes('incidencias.ver_todas');
    const params = [];
    let where = '1=1';

    if (!puedeTodas) {
      where += ' AND i.use_emno = ?';
      params.push(req.user.ter_cote);
    }
    if (req.query.cliente) {
      where += ' AND i.ter_cote = ?';
      params.push(req.query.cliente);
    }
    if (req.query.desde) {
      where += ' AND i.fe_regi >= ?';
      params.push(req.query.desde);
    }
    if (req.query.hasta) {
      where += ' AND i.fe_regi <= ?';
      params.push(req.query.hasta);
    }
    if (req.query.q) {
      where += ' AND (c.ter_deno LIKE ? OR v.ter_deno LIKE ? OR i.use_emno LIKE ?)';
      const like = `%${req.query.q}%`;
      params.push(like, like, like);
    }
    if (req.query.vendedor) {
      where += ' AND i.use_emno = ?';
      params.push(req.query.vendedor);
    }
    if (req.query.independientes === '1') {
      where += ' AND i.ter_cote IS NULL';
    } else if (!req.query.cliente) {
      where += ' AND i.ter_cote IS NOT NULL';
    }

    const [rows] = await pool.query(
      `SELECT i.inc_codi, i.inc_codi_erp, i.ter_cote,
              c.ter_deno AS cliente_nombre,
              i.use_emno, v.ter_deno AS vendedor_nombre,
              i.inc_cont, i.inc_desc, i.inc_acci,
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc,
              i.sincronizada, ${CAMPOS_GPS}
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       LEFT JOIN vendedores v ON v.ter_cote = i.use_emno
       WHERE ${where}
       ORDER BY i.fe_regi DESC, i.inc_codi DESC
       LIMIT 500`,
      params
    );
    const rowsLimpio = rows.map((r) => ({ ...r, inc_desc: limpiarDesc(r.inc_desc) }));
    res.json(rowsLimpio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Frecuencia de visitas / resumen por cliente
// GET /api/incidencias/frecuencia
//   ?q=texto  filtrar por nombre de cliente o vendedor
router.get('/frecuencia', async (req, res) => {
  try {
    const puedeTodas = req.user.permisos && req.user.permisos.includes('incidencias.ver_todas');
    const params = [];
    // Un vendedor solo ve la frecuencia de sus propias visitas.
    const fVendI = puedeTodas ? '' : ' AND i.use_emno = ? ';
    const fVendX = puedeTodas ? '' : ' AND x.use_emno = ? ';
    const fVendX2 = puedeTodas ? '' : ' AND x2.use_emno = ? ';
    if (!puedeTodas) params.push(req.user.ter_cote, req.user.ter_cote, req.user.ter_cote);

    // Filtro por nombre de cliente o vendedor (se aplica en la consulta
    // principal, por eso se hace sobre i con joins a clientes/vendedores).
    const fBusq = req.query.q
      ? ' AND (c.ter_deno LIKE ? OR v.ter_deno LIKE ?) '
      : ' ';
    if (req.query.q) {
      const like = `%${req.query.q}%`;
      params.push(like, like);
    }

    const [rows] = await pool.query(
      `SELECT i.ter_cote,
              c.ter_deno AS cliente_nombre,
              v.ter_deno AS vendedor_nombre,
              u.inc_desc AS ultima_desc,
              COUNT(*) AS total_visitas,
              MAX(i.fe_regi) AS ultima_visita,
              MIN(i.fe_regi) AS primera_visita,
              DATEDIFF(CURDATE(), MAX(i.fe_regi)) AS dias_desde_ultima,
              ROUND(DATEDIFF(MAX(i.fe_regi), MIN(i.fe_regi)) / GREATEST(COUNT(*) - 1, 1)) AS promedio_dias_entre_visitas,
              SUM(CASE WHEN i.fe_regi >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS visitas_ultimos_30
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       LEFT JOIN (
          SELECT x.ter_cote, x.inc_desc, x.use_emno
          FROM incidencias x
          JOIN (SELECT ter_cote, MAX(fe_regi) AS mf
                FROM incidencias x2
                WHERE x2.ter_cote IS NOT NULL ${fVendX2}
                GROUP BY ter_cote) g
            ON g.ter_cote = x.ter_cote AND g.mf = x.fe_regi
          WHERE x.ter_cote IS NOT NULL ${fVendX}
          GROUP BY x.ter_cote
       ) u ON u.ter_cote = i.ter_cote
       LEFT JOIN vendedores v ON v.ter_cote = u.use_emno
       WHERE i.ter_cote IS NOT NULL ${fVendI} ${fBusq}
       GROUP BY i.ter_cote, c.ter_deno, v.ter_deno, u.inc_desc
       ORDER BY ultima_visita DESC`,
      params
    );
    const rowsLimpio = rows.map((r) => ({ ...r, ultima_desc: limpiarDesc(r.ultima_desc) }));
    res.json(rowsLimpio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Incidencias de un cliente
router.get('/cliente/:codigo', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.inc_codi, i.inc_codi_erp, i.ter_cote, c.ter_deno AS cliente_nombre,
              i.use_emno, v.ter_deno AS vendedor_nombre,
              i.inc_cont, i.inc_desc, i.inc_acci,
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc,
              ${CAMPOS_GPS}
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       LEFT JOIN vendedores v ON v.ter_cote = i.use_emno
       WHERE i.ter_cote = ?
       ORDER BY i.fe_regi DESC`,
      [req.params.codigo]
    );
    const rowsLimpio = rows.map((r) => ({ ...r, inc_desc: limpiarDesc(r.inc_desc) }));
    res.json(rowsLimpio);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Detalle de una incidencia (incluye detalle mcoinci020)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.inc_codi, i.inc_codi_erp, i.ter_cote, c.ter_deno AS cliente_nombre,
              i.inc_cont, i.inc_desc, i.inc_acci,
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc,
              ${CAMPOS_GPS}
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       WHERE i.inc_codi = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    const [detalle] = await pool.query(
      `SELECT inc_nro, inc_desc, inc_resp, inc_stat
       FROM incidencia_detalle WHERE inc_codi = ? ORDER BY inc_nro`,
      [req.params.id]
    );
    const detalleLimpio = detalle.map((d) => ({ ...d, inc_desc: limpiarDesc(d.inc_desc) }));

    res.json({ ...rows[0], inc_desc: limpiarDesc(rows[0].inc_desc), detalle: detalleLimpio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar nueva incidencia (SIEMPRE ligada a un cliente).
// Body: { ter_cote, inc_desc, inc_acci, fe_aten,
//         inc_lat, inc_lng, inc_gps_acc,      <- GPS opcional (movil)
//         actualizar_cliente }                 <- true si el vendedor confirmo
//                                                guardar/actualizar el punto de
//                                                referencia del cliente
router.post('/', async (req, res) => {
  const { ter_cote, inc_cont, inc_desc, inc_acci, fe_aten } = req.body;
  if (!inc_desc) {
    return res.status(400).json({ error: 'Se requiere inc_desc' });
  }
  if (!ter_cote) {
    return res.status(400).json({ error: 'La incidencia debe estar ligada a un cliente (ter_cote)' });
  }

  const coords = coordsDelBody(req.body);
  const actualizarCliente = coords && req.body.actualizar_cliente === true;

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [result] = await conexion.query(
      `INSERT INTO incidencias
         (ter_cote, use_emno, inc_cont, inc_desc, inc_acci,
          fe_regi, fe_aten, inc_esta, inc_estc, sincronizada,
          inc_lat, inc_lng, inc_gps_acc, inc_gps_fec)
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?, 1, 1, 0, ?, ?, ?, NOW())`,
      [ter_cote, req.user.ter_cote, inc_cont || null, inc_desc, inc_acci || null, fe_aten || null,
       coords ? coords.lat : null, coords ? coords.lng : null, coords ? coords.acc : null]
    );

    // ---- Punto de referencia del cliente ----
    // Solo se guarda/actualiza si el vendedor lo confirmo desde la app.
    let referencia = null;
    if (coords && req.body.actualizar_cliente !== undefined) {
      const [refs] = await conexion.query(
        'SELECT ter_cote, lat, lng, visitas, umbral_m FROM cliente_ubicaciones WHERE ter_cote = ?',
        [ter_cote]
      );
      const cfg = await configGps();

      if (refs.length === 0 && actualizarCliente) {
        await conexion.query(
          `INSERT INTO cliente_ubicaciones (ter_cote, lat, lng, gps_acc, actualizado, visitas)
           VALUES (?, ?, ?, ?, NOW(), 1)`,
          [ter_cote, coords.lat, coords.lng, coords.acc]
        );
        referencia = { accion: 'creada', lat: coords.lat, lng: coords.lng, visitas: 1 };
      } else if (refs.length > 0) {
        const ref = refs[0];
        const umbral = ref.umbral_m || cfg.umbral_global;
        const dist = distanciaMetro(Number(ref.lat), Number(ref.lng), coords.lat, coords.lng);
        if (actualizarCliente) {
          if (dist <= cfg.umbral_tope) {
            await conexion.query(
              `UPDATE cliente_ubicaciones
               SET lat = ?, lng = ?, gps_acc = ?, actualizado = NOW(), visitas = visitas + 1
               WHERE ter_cote = ?`,
              [coords.lat, coords.lng, coords.acc, ter_cote]
            );
            referencia = { accion: 'actualizada', lat: coords.lat, lng: coords.lng, visitas: ref.visitas + 1 };
          } else {
            // A mas del tope: guarda la visita con sus coords pero NO mueve
            // el punto de referencia (posible GPS disparado en otro lugar).
            referencia = { accion: 'rechazada', motivo: 'fuera_del_tope', dist: Math.round(dist) };
          }
        } else {
          referencia = { accion: 'sin_cambio', dist: Math.round(dist), umbral };
        }
      }
    }

    await conexion.commit();
    res.status(201).json({
      inc_codi: result.insertId,
      referencia,
      message: 'Incidencia registrada (pendiente de envio al ERP)'
    });
  } catch (err) {
    await conexion.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conexion.release();
  }
});

// Editar una incidencia (solo la propia o con permiso 'incidencias.ver_todas').
// Body: { inc_desc, inc_acci?, inc_estc? }
// IMPORTANTE: al editar NO se captura ni se modifica ninguna coordenada
// GPS — los campos inc_lat/inc_lng/inc_gps_* que envie el body se ignoran.
// Las incidencias originadas en el ERP (inc_codi_erp) NO se editan porque
// la sincronizacion ERP -> App las sobreescribiria en la proxima corrida.
router.put('/:codi', async (req, res) => {
  try {
    const permisos = req.user.permisos || [];
    if (!permisos.includes('incidencias.editar')) {
      return res.status(403).json({ error: 'No tienes permisos para esta opcion', permiso: 'incidencias.editar' });
    }

    const codi = parseInt(req.params.codi, 10);
    if (!codi || isNaN(codi)) {
      return res.status(400).json({ error: 'Codigo de incidencia invalido' });
    }

    const [rows] = await pool.query(
      'SELECT inc_codi, use_emno, inc_codi_erp FROM incidencias WHERE inc_codi = ?',
      [codi]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }
    const inc = rows[0];

    const puedeTodas = req.user.permisos && req.user.permisos.includes('incidencias.ver_todas');
    if (!puedeTodas && inc.use_emno !== req.user.ter_cote) {
      return res.status(403).json({ error: 'No tienes permiso para editar esta incidencia' });
    }
    if (inc.inc_codi_erp) {
      return res.status(400).json({ error: 'Incidencia proveniente del ERP: no es editable (la sincronizacion la sobreescribiria)' });
    }

    const { inc_desc, inc_acci, inc_estc } = req.body;
    if (!inc_desc || !String(inc_desc).trim()) {
      return res.status(400).json({ error: 'Se requiere inc_desc' });
    }
    if (inc_estc !== undefined && inc_estc !== null && inc_estc !== '' && ![1, 2, 3].includes(Number(inc_estc))) {
      return res.status(400).json({ error: 'Estado invalido (1=Registrada, 2=En proceso, 3=Resuelta)' });
    }

    const campos = ['inc_desc = ?', 'inc_acci = ?'];
    const params = [String(inc_desc).trim(), inc_acci ? String(inc_acci).trim() : null];
    if (inc_estc !== undefined && inc_estc !== null && inc_estc !== '') {
      campos.push('inc_estc = ?');
      params.push(Number(inc_estc));
    }
    params.push(codi);

    await pool.query(`UPDATE incidencias SET ${campos.join(', ')} WHERE inc_codi = ?`, params);
    res.json({ ok: true, message: 'Incidencia actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================
// NOTA DE VOZ (audio opcional de la incidencia)
// El archivo se guarda con nombre {inc_codi}.{ext} en
// api/uploads/incidencias/ — la relacion es por nombre,
// no se agrega columna a la tabla.
// ============================================================

// Subir audio de una incidencia
// POST /api/incidencias/:codi/audio   (multipart, campo "archivo")
router.post('/:codi/audio', async (req, res) => {
  try {
    const codi = parseInt(req.params.codi, 10);
    if (!codi || isNaN(codi)) {
      return res.status(400).json({ error: 'Codigo de incidencia invalido' });
    }

    const [rows] = await pool.query('SELECT inc_codi FROM incidencias WHERE inc_codi = ?', [codi]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    if (!req.files || !req.files.archivo) {
      return res.status(400).json({ error: 'No se envio archivo' });
    }

    const archivo = req.files.archivo;
    const ext = path.extname(archivo.name || '').toLowerCase();
    if (!AUDIO_EXT_PERMITIDAS.includes(ext)) {
      return res.status(400).json({ error: `Formato de audio no permitido: ${ext || '(sin extension)'}` });
    }

    if (!fs.existsSync(UPLOAD_AUDIO_DIR)) fs.mkdirSync(UPLOAD_AUDIO_DIR, { recursive: true });

    // Relacion por nombre: {inc_codi}.{ext}
    const destino = path.join(UPLOAD_AUDIO_DIR, `${codi}${ext}`);
    await archivo.mv(destino);

    res.json({ ruta: destino, nombre: `${codi}${ext}`, tamano: archivo.size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Verificar si una incidencia tiene audio
// GET /api/incidencias/:codi/audio
router.get('/:codi/audio', async (req, res) => {
  try {
    const codi = parseInt(req.params.codi, 10);
    if (!codi || isNaN(codi)) {
      return res.status(400).json({ error: 'Codigo de incidencia invalido' });
    }

    if (!fs.existsSync(UPLOAD_AUDIO_DIR)) {
      return res.json({ existe: false });
    }

    for (const ext of AUDIO_EXT_PERMITIDAS) {
      const p = path.join(UPLOAD_AUDIO_DIR, `${codi}${ext}`);
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        return res.json({ existe: true, nombre: `${codi}${ext}`, tamano: stat.size });
      }
    }
    res.json({ existe: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.configGps = configGps;