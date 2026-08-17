const router = require('express').Router();
const pool = require('../config/db');

// Lista de clientes.
// - Con permiso 'clientes.ver_todos' (admin/empleado): todos.
// - Sin el permiso (vendedor): solo los de su cartera (ter_core).
// - ?q=texto  filtra por nombre o codigo (para buscar al crear incidencias).
router.get('/', async (req, res) => {
  try {
    const puedeTodos = req.user.permisos && req.user.permisos.includes('clientes.ver_todos');
    const params = [];
    const where = [];
    if (!puedeTodos) {
      where.push('c.ter_core = ?');
      params.push(req.user.ter_cote);
    }
    if (req.query.q) {
      where.push('(c.ter_deno LIKE ? OR c.ter_cote LIKE ?)');
      const like = `%${req.query.q}%`;
      params.push(like, like);
    }
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // El listado general trae todos los clientes; la busqueda ?q= se limita
    // a 100 para que el buscador en vivo siga siendo rapido.
    const limit = req.query.q ? 'LIMIT 100' : '';
    const [rows] = await pool.query(
      `SELECT c.ter_cote, c.ter_deno, c.ter_dire, c.ter_rucn, c.ter_fono, c.ter_cell, c.ter_emai,
              c.ter_cocp, cp.com_dscp AS cond_pago_desc, c.ter_licr, c.ter_cozo
       FROM clientes c
       LEFT JOIN condiciones_pago cp ON cp.com_cocp = c.ter_cocp
       ${sql}
       ORDER BY c.ter_deno
       ${limit}`,
      params
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
      `SELECT c.ter_cote, c.ter_deno, c.ter_dire, c.ter_rucn, c.ter_fono, c.ter_cell, c.ter_emai,
              c.ter_cocp, cp.com_dscp AS cond_pago_desc, c.ter_licr, c.ter_cozo,
              c.ter_core, v.ter_deno AS vendedor_nombre
       FROM clientes c
       LEFT JOIN condiciones_pago cp ON cp.com_cocp = c.ter_cocp
       LEFT JOIN vendedores v ON v.ter_cote = c.ter_core
       WHERE c.ter_cote = ?`,
      [req.params.codigo]
    );
    if (cli.length === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    const [docs] = await pool.query(
      `SELECT cob_tivo, cob_nuvo, cob_codo, tipo_documento_desc, cob_seri, cob_nums,
              fecha_emision, fecha_vencimiento, dias_vencido,
              cob_como, moneda_signo, estado_descripcion,
              cob_cocp, cond_pago_desc,
              cob_banc, banco_desc, cob_nuni,
              vendedor_nombre,
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

    const [ultimaInc] = await pool.query(
      `SELECT inc_codi, inc_desc, fe_regi, inc_estc
       FROM incidencias
       WHERE ter_cote = ? AND fe_regi IS NOT NULL
       ORDER BY fe_regi DESC, inc_codi DESC
       LIMIT 1`,
      [req.params.codigo]
    );

    res.json({ cliente: cli[0], resumen, documentos: docs, ultima_incidencia: ultimaInc[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
