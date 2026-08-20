const router = require('express').Router();
const pool = require('../config/db');

// Construye el WHERE comun del listado de clientes segun el rol y los filtros.
// Devuelve { where, params, puedeTodos } listos para usar en un query.
function filtroClientes(req, alias = 'c') {
  const puedeTodos = req.user.permisos && req.user.permisos.includes('clientes.ver_todos');
  const params = [];
  const where = [];
  if (!puedeTodos) {
    where.push(`${alias}.ter_core = ?`);
    params.push(req.user.ter_cote);
  } else if (req.query.vendedor) {
    const lista = req.query.vendedor.split(',').filter(Boolean);
    if (lista.length > 0) {
      where.push(`${alias}.ter_core IN (${lista.map(() => '?').join(',')})`);
      params.push(...lista);
    }
  }
  if (req.query.q) {
    where.push(`(${alias}.ter_deno LIKE ? OR ${alias}.ter_cote LIKE ?)`);
    const like = `%${req.query.q}%`;
    params.push(like, like);
  }
  return { where, params, puedeTodos };
}

// Lista de clientes.
// - Con permiso 'clientes.ver_todos' (admin/empleado): todos.
// - Sin el permiso (vendedor): solo los de su cartera (ter_core).
// - ?q=texto          filtra por nombre o codigo (para buscar al crear incidencias).
// - ?vendedor=1,2,3   filtra por uno o varios vendedores (solo para quien ve todos).
// Incluye el saldo pendiente por cliente (soles y dolares).
router.get('/', async (req, res) => {
  try {
    const { where, params } = filtroClientes(req);
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    // El listado general trae todos los clientes; la busqueda ?q= se limita
    // a 100 para que el buscador en vivo siga siendo rapido.
    const limit = req.query.q ? 'LIMIT 100' : '';
    const [rows] = await pool.query(
      `SELECT c.ter_cote, c.ter_deno, c.ter_dire, c.ter_rucn, c.ter_fono, c.ter_cell, c.ter_emai,
              c.ter_cocp, cp.com_dscp AS cond_pago_desc, c.ter_licr, c.ter_cozo,
              c.ter_core, v.ter_deno AS vendedor_nombre,
              COUNT(d.cob_nuvo) AS total_documentos,
              COALESCE(SUM(CASE WHEN d.cob_como = 'PEN' THEN d.saldo ELSE 0 END), 0) AS saldo_pen,
              COALESCE(SUM(CASE WHEN d.cob_como = 'USD' THEN d.saldo ELSE 0 END), 0) AS saldo_usd
       FROM clientes c
       LEFT JOIN condiciones_pago cp ON cp.com_cocp = c.ter_cocp
       LEFT JOIN vendedores v ON v.ter_cote = c.ter_core
       LEFT JOIN vw_documentos_pendientes d ON d.cob_cote = c.ter_cote
       ${sql}
       GROUP BY c.ter_cote, c.ter_deno, c.ter_dire, c.ter_rucn, c.ter_fono, c.ter_cell, c.ter_emai,
                c.ter_cocp, cp.com_dscp, c.ter_licr, c.ter_cozo, c.ter_core, v.ter_deno
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

// Lista de vendedores para el filtro de la lista de clientes.
router.get('/vendedores', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ter_cote, ter_deno FROM vendedores ORDER BY ter_deno`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Resumen por CLIENTE (no por documento):
//   - cronograma:    saldo del cliente en cada rango de vencimiento
//   - antiguedad:    saldo del cliente en cada rango de dias vencidos
//   - porCondicion:  totales por condicion de pago
//   - porEstado:     totales por estado del documento
// Los parametros de rangos los envia el frontend (misma logica que el detalle).
//   ?fechaInicial=YYYY-MM-DD & diasRango=30 & cantRangos=4
//   ?diasRangoAnti=30 & cantRangosAnti=4
router.get('/resumen', async (req, res) => {
  try {
    const { where, params } = filtroClientes(req);
    const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const fechaInicial = req.query.fechaInicial || new Date().toISOString().slice(0, 10);
    const diasRango = Math.max(1, Number(req.query.diasRango) || 30);
    const cantRangos = Math.max(1, Number(req.query.cantRangos) || 4);
    const diasRangoAnti = Math.max(1, Number(req.query.diasRangoAnti) || 30);
    const cantRangosAnti = Math.max(1, Number(req.query.cantRangosAnti) || 4);

    // --- Cronograma de vencimientos por cliente ---
    // Casos: r0=Vencidos (< fechaInicial), r1..rN rangos, r(N+1)=Mayores (> ultimo rango).
    // OJO: en el SQL los '?' del SELECT aparecen antes que los del WHERE, por eso
    // los parametros de rangos van PRIMERO y los del filtro (where) al final.
    function sumarDias(iso, n) {
      const d = new Date(`${iso}T00:00:00`);
      d.setDate(d.getDate() + n);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    }

    const rangoSel = [];
    const rangoValores = [];
    const rangoCases = [];
    rangoCases.push('SUM(CASE WHEN d.fecha_vencimiento < ? THEN d.saldo ELSE 0 END)');
    rangoValores.push(fechaInicial);
    for (let i = 0; i < cantRangos; i++) {
      const ini = sumarDias(fechaInicial, i * diasRango);
      const fin = sumarDias(fechaInicial, i * diasRango + diasRango - 1);
      rangoCases.push('SUM(CASE WHEN d.fecha_vencimiento >= ? AND d.fecha_vencimiento <= ? THEN d.saldo ELSE 0 END)');
      rangoValores.push(ini, fin);
    }
    rangoCases.push('SUM(CASE WHEN d.fecha_vencimiento > ? THEN d.saldo ELSE 0 END)');
    rangoValores.push(sumarDias(fechaInicial, cantRangos * diasRango));
    rangoCases.forEach((c, i) => rangoSel.push(`COALESCE(${c}, 0) AS r${i}`));

    const [cronograma] = await pool.query(
      `SELECT c.ter_cote, c.ter_deno,
              COALESCE(SUM(d.saldo), 0) AS saldo_total,
              ${rangoSel.join(',\n              ')}
       FROM clientes c
       LEFT JOIN vw_documentos_pendientes d ON d.cob_cote = c.ter_cote
       ${sql}
       GROUP BY c.ter_cote, c.ter_deno
       HAVING saldo_total > 0
       ORDER BY c.ter_deno`,
      [...rangoValores, ...params]
    );

    // --- Antiguedad por cliente ---
    // r0=Al dia, r1..rN rangos de dias vencidos, r(N+1)=Mayores.
    const antiSel = [];
    const antiValores = [];
    const antiCases = [];
    antiCases.push('SUM(CASE WHEN d.dias_vencido <= 0 THEN d.saldo ELSE 0 END)');
    for (let i = 0; i < cantRangosAnti; i++) {
      const min = i * diasRangoAnti + 1;
      const max = (i + 1) * diasRangoAnti;
      antiCases.push(`SUM(CASE WHEN d.dias_vencido >= ${min} AND d.dias_vencido <= ${max} THEN d.saldo ELSE 0 END)`);
    }
    antiCases.push('SUM(CASE WHEN d.dias_vencido > ? THEN d.saldo ELSE 0 END)');
    antiValores.push(cantRangosAnti * diasRangoAnti);
    antiCases.forEach((c, i) => antiSel.push(`COALESCE(${c}, 0) AS r${i}`));

    const [antiguedad] = await pool.query(
      `SELECT c.ter_cote, c.ter_deno,
              COALESCE(SUM(d.saldo), 0) AS saldo_total,
              ${antiSel.join(',\n              ')}
       FROM clientes c
       LEFT JOIN vw_documentos_pendientes d ON d.cob_cote = c.ter_cote
       ${sql}
       GROUP BY c.ter_cote, c.ter_deno
       HAVING saldo_total > 0
       ORDER BY c.ter_deno`,
      [...antiValores, ...params]
    );

    // --- Totales por condicion de pago ---
    const [porCondicion] = await pool.query(
      `SELECT COALESCE(NULLIF(d.cond_pago_desc, ''), d.cob_cocp, 'Sin condición') AS condicion,
              COUNT(*) AS total_documentos,
              SUM(d.saldo) AS total_saldo
       FROM vw_documentos_pendientes d
       JOIN clientes c ON c.ter_cote = d.cob_cote
       ${sql}
       GROUP BY condicion
       ORDER BY total_saldo DESC`,
      params
    );

    // --- Totales por estado ---
    const [porEstado] = await pool.query(
      `SELECT COALESCE(NULLIF(d.estado_descripcion, ''), 'Sin estado') AS estado,
              COUNT(*) AS total_documentos,
              SUM(d.saldo) AS total_saldo
       FROM vw_documentos_pendientes d
       JOIN clientes c ON c.ter_cote = d.cob_cote
       ${sql}
       GROUP BY estado
       ORDER BY total_saldo DESC`,
      params
    );

    // --- Totales generales ---
    const [tot] = await pool.query(
      `SELECT COUNT(*) AS total_documentos,
              COUNT(DISTINCT d.cob_cote) AS total_clientes,
              COALESCE(SUM(CASE WHEN d.cob_como = 'PEN' THEN d.saldo ELSE 0 END), 0) AS saldo_pen,
              COALESCE(SUM(CASE WHEN d.cob_como = 'USD' THEN d.saldo ELSE 0 END), 0) AS saldo_usd
       FROM vw_documentos_pendientes d
       JOIN clientes c ON c.ter_cote = d.cob_cote
       ${sql}`,
      params
    );

    res.json({
      cronograma,
      antiguedad,
      porCondicion,
      porEstado,
      totales: tot[0],
      rangos: { diasRango, cantRangos, fechaInicial, diasRangoAnti, cantRangosAnti }
    });
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