const router = require('express').Router();
const pool = require('../config/db');

// Incidencias del vendedor autenticado, con detalle del cliente
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.inc_codi, i.inc_codi_erp, i.ter_cote, c.ter_deno AS cliente_nombre,
              i.inc_cont, i.inc_desc, i.inc_acci,
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc,
              i.sincronizada
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       WHERE i.use_emno = ?
       ORDER BY i.fe_regi DESC`,
      [req.user.ter_cote]
    );
    res.json(rows);
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
              i.inc_cont, i.inc_desc, i.inc_acci,
              i.fe_regi, i.fe_aten, i.fe_resu, i.inc_esta, i.inc_estc
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       WHERE i.ter_cote = ?
       ORDER BY i.fe_regi DESC`,
      [req.params.codigo]
    );
    res.json(rows);
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

    res.json({ ...rows[0], detalle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Registrar nueva incidencia (queda pendiente de envio al ERP, sincronizada=0)
router.post('/', async (req, res) => {
  const { ter_cote, inc_cont, inc_desc, inc_acci, fe_aten } = req.body;
  if (!ter_cote || !inc_desc) {
    return res.status(400).json({ error: 'Se requiere ter_cote y inc_desc' });
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
