const router = require('express').Router();
const pool = require('../config/db');
const { requirePermiso } = require('../middleware/permisos');

// ============================================================
// MAPAS (web) — pantalla /mapas
// - Clientes: puntos de referencia desde cliente_ubicaciones.
// - Vendedores: NO es tracking en vivo. La posicion de cada
//   vendedor es la coordenada de su ULTIMA visita registrada
//   con GPS (incidencias) — "ubicacion segun su ultima fecha".
// - config: umbrales globales de GPS.
// Requieren el permiso 'mapas.ver' (y 'config.ver' para guardar config).
// ============================================================

// Lista de clientes con punto de referencia
// GET /api/mapas/clientes  ?q=  (opcional, filtra por nombre/codigo)
router.get('/clientes', requirePermiso('mapas.ver'), async (req, res) => {
  try {
    const params = [];
    let where = '1=1';
    if (req.query.q) {
      where += ' AND (c.ter_deno LIKE ? OR c.ter_cote LIKE ?)';
      const like = `%${req.query.q}%`;
      params.push(like, like);
    }
    const [rows] = await pool.query(
      `SELECT u.ter_cote, c.ter_deno, c.ter_dire, c.ter_core,
              v.ter_deno AS vendedor_nombre,
              u.lat, u.lng, u.gps_acc, u.actualizado, u.visitas,
              u.umbral_m,
              COALESCE(u.umbral_m, cg.umbral_global) AS umbral
       FROM cliente_ubicaciones u
       INNER JOIN clientes c ON c.ter_cote = u.ter_cote
       LEFT JOIN vendedores v ON v.ter_cote = c.ter_core
       CROSS JOIN (SELECT CAST(valor AS UNSIGNED) AS umbral_global
                   FROM config_gps WHERE clave = 'umbral_global') cg
       WHERE ${where}
       ORDER BY c.ter_deno`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ultima posicion registrada de cada vendedor (por su ultima visita con GPS)
// GET /api/mapas/vendedores  ?vendedor=COD1,COD2  (opcional)
router.get('/vendedores', requirePermiso('mapas.ver'), async (req, res) => {
  try {
    const params = [];
    let filtro = '';
    if (req.query.vendedor) {
      const lista = req.query.vendedor.split(',').filter(Boolean);
      if (lista.length > 0) {
        filtro = ` AND g.use_emno IN (${lista.map(() => '?').join(',')})`;
        params.push(...lista);
      }
    }
    // La fecha de captura (DATETIME) elige la "ultima" visita; fe_regi
    // solo guarda la fecha del dia.
    const [rows] = await pool.query(
      `SELECT g.use_emno,
              COALESCE(v.ter_deno, g.use_emno) AS vendedor_nombre,
              i.inc_codi, i.inc_lat, i.inc_lng, i.inc_gps_fec, i.inc_gps_acc,
              i.fe_regi, i.ter_cote AS cliente_codigo, c.ter_deno AS cliente_nombre,
              g.total_con_gps
       FROM (
         SELECT x.use_emno, MAX(x.inc_gps_fec) AS mf, COUNT(*) AS total_con_gps
         FROM incidencias x
         WHERE x.use_emno IS NOT NULL AND x.inc_lat IS NOT NULL
         GROUP BY x.use_emno
       ) g
       JOIN incidencias i
         ON i.use_emno = g.use_emno AND i.inc_gps_fec = g.mf AND i.inc_lat IS NOT NULL
       LEFT JOIN vendedores v ON v.ter_cote = g.use_emno
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       WHERE 1=1 ${filtro}
       ORDER BY vendedor_nombre`,
      params
    );
    // Si un vendedor tuviera 2 incidencias con exactamente el mismo
    // inc_gps_fec, se deja la de mayor inc_codi.
    const vistos = new Set();
    const unicos = rows
      .sort((a, b) => b.inc_codi - a.inc_codi)
      .filter((r) => {
        if (vistos.has(r.use_emno)) return false;
        vistos.add(r.use_emno);
        return true;
      });
    res.json(unicos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Config global de GPS (umbrales)
// GET /api/mapas/config  (ver, requiere mapas.ver)
// PUT /api/mapas/config  (guardar, requiere config.ver)
router.get('/config', requirePermiso('mapas.ver'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT clave, valor FROM config_gps ORDER BY clave');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.put('/config', requirePermiso('config.ver'), async (req, res) => {
  try {
    const permitidas = ['umbral_global', 'umbral_tope'];
    const cambios = permitidas.filter((k) => req.body[k] !== undefined);
    if (cambios.length === 0) {
      return res.status(400).json({ error: 'No se envio ninguna clave valida' });
    }
    for (const clave of cambios) {
      const n = Number(req.body[clave]);
      if (!Number.isFinite(n) || n < 0 || n > 100000) {
        return res.status(400).json({ error: `Valor invalido para ${clave} (metros 0-100000)` });
      }
      await pool.query(
        `INSERT INTO config_gps (clave, valor) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE valor = ?`,
        [clave, String(Math.round(n)), String(Math.round(n))]
      );
    }
    const [rows] = await pool.query('SELECT clave, valor FROM config_gps ORDER BY clave');
    res.json({ ok: true, config: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
