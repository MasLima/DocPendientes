const router = require('express').Router();
const pool = require('../config/db');

// Limpia el relleno del ERP (tabs y espacios repetidos) en las descripciones.
// Los emojis y acentos se conservan (la conexion es utf8mb4).
function limpiarDesc(s) {
  if (!s) return s;
  return s.replace(/\t/g, ' ').replace(/[ ]{2,}/g, ' ').trim();
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
              i.sincronizada
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
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc
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
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc
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
// Body: { ter_cote, inc_desc, inc_acci, fe_aten }
router.post('/', async (req, res) => {
  const { ter_cote, inc_cont, inc_desc, inc_acci, fe_aten } = req.body;
  if (!inc_desc) {
    return res.status(400).json({ error: 'Se requiere inc_desc' });
  }
  if (!ter_cote) {
    return res.status(400).json({ error: 'La incidencia debe estar ligada a un cliente (ter_cote)' });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [result] = await conexion.query(
      `INSERT INTO incidencias
         (ter_cote, use_emno, inc_cont, inc_desc, inc_acci,
          fe_regi, fe_aten, inc_esta, inc_estc, sincronizada)
       VALUES (?, ?, ?, ?, ?, CURDATE(), ?, 1, 1, 0)`,
      [ter_cote, req.user.ter_cote, inc_cont || null, inc_desc, inc_acci || null, fe_aten || null]
    );

    await conexion.commit();
    res.status(201).json({
      inc_codi: result.insertId,
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

module.exports = router;