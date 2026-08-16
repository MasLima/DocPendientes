const router = require('express').Router();
const pool = require('../config/db');

// Documentos pendientes del vendedor autenticado, con filtros opcionales
// Filtros por query: ?cliente=001&vencido=1&moneda=PEN
router.get('/', async (req, res) => {
  const { cliente, vencido, moneda } = req.query;
  const condiciones = ['v.ter_core = ?'];
  const params = [req.user.ter_cote];

  if (cliente) {
    condiciones.push('d.cob_cote = ?');
    params.push(cliente);
  }
  if (vencido === '1') {
    condiciones.push('d.fecha_vencimiento < CURDATE()');
  }
  if (moneda) {
    condiciones.push('d.cob_como = ?');
    params.push(moneda);
  }

  try {
    const [rows] = await pool.query(
      `SELECT d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
              d.cob_cote, d.cliente_nombre, d.cliente_ruc,
              d.fecha_emision, d.fecha_vencimiento, d.dias_vencido,
              d.cob_como, d.moneda_signo, d.estado_descripcion,
              d.importe_original, d.pagado, d.saldo
       FROM vw_documentos_pendientes d
       JOIN clientes v ON v.ter_cote = d.cob_cote
       WHERE ${condiciones.join(' AND ')}
       ORDER BY d.fecha_vencimiento`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
