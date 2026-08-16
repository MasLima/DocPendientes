const router = require('express').Router();
const pool = require('../config/db');

// Reporte: saldos por cliente (del vendedor autenticado)
// GET /api/reportes/saldos-por-cliente
router.get('/saldos-por-cliente', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.cob_cote, d.cliente_nombre, d.cliente_ruc,
              COUNT(*) AS total_documentos,
              SUM(CASE WHEN d.dias_vencido > 0 THEN 1 ELSE 0 END) AS total_vencidos,
              SUM(CASE WHEN d.cob_como = 'PEN' THEN d.saldo ELSE 0 END) AS saldo_pen,
              SUM(CASE WHEN d.cob_como = 'USD' THEN d.saldo ELSE 0 END) AS saldo_usd,
              MAX(d.dias_vencido) AS max_dias_vencido
       FROM vw_documentos_pendientes d
       JOIN clientes v ON v.ter_cote = d.cob_cote
       WHERE v.ter_core = ?
       GROUP BY d.cob_cote, d.cliente_nombre, d.cliente_ruc
       ORDER BY saldo_pen DESC, saldo_usd DESC`,
      [req.user.ter_cote]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Reporte: resumen por vendedor (administrativo / todos)
// GET /api/reportes/saldos-por-vendedor
router.get('/saldos-por-vendedor', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.ter_cote, v.ter_deno AS vendedor_nombre,
              COUNT(DISTINCT d.cob_cote) AS num_clientes,
              COUNT(*) AS total_documentos,
              SUM(CASE WHEN d.dias_vencido > 0 THEN 1 ELSE 0 END) AS total_vencidos,
              SUM(CASE WHEN d.cob_como = 'PEN' THEN d.saldo ELSE 0 END) AS saldo_pen,
              SUM(CASE WHEN d.cob_como = 'USD' THEN d.saldo ELSE 0 END) AS saldo_usd
       FROM vw_documentos_pendientes d
       JOIN clientes v ON v.ter_cote = d.cob_cote
       GROUP BY v.ter_cote, v.ter_deno
       ORDER BY saldo_pen DESC`,
      []
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
