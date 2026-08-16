const router = require('express').Router();
const pool = require('../config/db');

// Lista de clientes del vendedor autenticado (por ter_core)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ter_cote, ter_deno, ter_dire, ter_rucn, ter_fono, ter_cell, ter_emai,
              ter_cocp, ter_licr, ter_cozo
       FROM clientes
       WHERE ter_core = ?
       ORDER BY ter_deno`,
      [req.user.ter_cote]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Detalle de un cliente con su resumen de saldos
router.get('/:codigo', async (req, res) => {
  try {
    const [cli] = await pool.query(
      `SELECT ter_cote, ter_deno, ter_dire, ter_rucn, ter_fono, ter_cell, ter_emai,
              ter_cocp, ter_licr, ter_cozo
       FROM clientes WHERE ter_cote = ?`,
      [req.params.codigo]
    );
    if (cli.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const [docs] = await pool.query(
      `SELECT cob_tivo, cob_nuvo, cob_codo, cob_seri, cob_nums,
              fecha_emision, fecha_vencimiento, dias_vencido,
              cob_como, moneda_signo, estado_descripcion,
              importe_original, pagado, saldo
       FROM vw_documentos_pendientes
       WHERE cob_cote = ?
       ORDER BY fecha_vencimiento`,
      [req.params.codigo]
    );

    const resumen = docs.reduce(
      (acc, d) => {
        const signo = d.moneda_signo || '';
        const clave = `saldo_${d.cob_como}`;
        acc[clave] = (acc[clave] || 0) + Number(d.saldo || 0);
        acc.total_documentos += 1;
        if (d.dias_vencido > 0) acc.total_vencidos += 1;
        return acc;
      },
      { total_documentos: 0, total_vencidos: 0 }
    );

    res.json({ cliente: cli[0], resumen, documentos: docs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
