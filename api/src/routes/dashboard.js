const router = require('express').Router();
const pool = require('../config/db');

// ============================================================
// DASHBOARD
// Las consultas filtran por vendedor si el usuario no tiene el
// permiso 'clientes.ver_todos' (vendedor). Empleado/Admin ven todos.
// ============================================================

function filtroVendedor(req) {
  // Si el usuario puede ver todos los vendedores, no filtra.
  // Si no (vendedor), filtra por su ter_cote.
  if (req.user.permisos && req.user.permisos.includes('clientes.ver_todos')) {
    return { sql: '', params: [] };
  }
  return { sql: ' AND v.ter_core = ? ', params: [req.user.ter_cote] };
}

// 1) Saldos por vendedor
router.get('/saldos-por-vendedor', async (req, res) => {
  try {
    // Si el usuario puede ver todos los vendedores, no filtra.
    // Si no (vendedor), solo su propia fila.
    const puedeTodos = req.user.permisos && req.user.permisos.includes('clientes.ver_todos');
    const sql = puedeTodos ? '' : ' AND v.ter_cote = ? ';
    const params = puedeTodos ? [] : [req.user.ter_cote];
    const [rows] = await pool.query(
      `SELECT v.ter_cote, v.ter_deno AS vendedor_nombre,
              COUNT(DISTINCT d.cob_cote) AS num_clientes,
              COUNT(*) AS total_documentos,
              SUM(CASE WHEN d.dias_vencido > 0 THEN 1 ELSE 0 END) AS total_vencidos,
              SUM(CASE WHEN d.cob_como = 'PEN' THEN d.saldo ELSE 0 END) AS saldo_pen,
              SUM(CASE WHEN d.cob_como = 'USD' THEN d.saldo ELSE 0 END) AS saldo_usd
       FROM vw_documentos_pendientes d
       JOIN vendedores v ON v.ter_cote = d.vendedor_codigo
       WHERE 1=1 ${sql}
       GROUP BY v.ter_cote, v.ter_deno
       ORDER BY saldo_pen DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 2) Top clientes deudores (con filtro por vendedor)
router.get('/top-clientes', async (req, res) => {
  try {
    const { sql, params } = filtroVendedor(req);
    const [rows] = await pool.query(
      `SELECT d.cob_cote, d.cliente_nombre, d.cliente_ruc,
              COUNT(*) AS total_documentos,
              SUM(CASE WHEN d.cob_como = 'PEN' THEN d.saldo ELSE 0 END) AS saldo_pen,
              SUM(CASE WHEN d.cob_como = 'USD' THEN d.saldo ELSE 0 END) AS saldo_usd,
              MAX(d.dias_vencido) AS max_dias_vencido
       FROM vw_documentos_pendientes d
       JOIN clientes v ON v.ter_cote = d.cob_cote
       WHERE 1=1 ${sql}
       GROUP BY d.cob_cote, d.cliente_nombre, d.cliente_ruc
       ORDER BY saldo_pen DESC, saldo_usd DESC
       LIMIT 10`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 3) Documentos por antiguedad de vencimiento
router.get('/documentos-antiguedad', async (req, res) => {
  try {
    const { sql, params } = filtroVendedor(req);
    const [rows] = await pool.query(
      `SELECT
         SUM(CASE WHEN d.dias_vencido <= 0 THEN 1 ELSE 0 END) AS al_dia,
         SUM(CASE WHEN d.dias_vencido BETWEEN 1 AND 30 THEN 1 ELSE 0 END) AS de_1_30,
         SUM(CASE WHEN d.dias_vencido BETWEEN 31 AND 60 THEN 1 ELSE 0 END) AS de_31_60,
         SUM(CASE WHEN d.dias_vencido BETWEEN 61 AND 90 THEN 1 ELSE 0 END) AS de_61_90,
         SUM(CASE WHEN d.dias_vencido > 90 THEN 1 ELSE 0 END) AS mas_90,
         COUNT(*) AS total
       FROM vw_documentos_pendientes d
       JOIN clientes v ON v.ter_cote = d.cob_cote
       WHERE 1=1 ${sql}`,
      params
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 4) Resumen de incidencias y frecuencia de visitas
//    Por cliente: total de visitas/incidencias, ultima visita, promedio.
router.get('/incidencias-resumen', async (req, res) => {
  try {
    const puedeTodas = req.user.permisos && req.user.permisos.includes('incidencias.ver_todas');
    const params = [];
    let sql = '';
    if (!puedeTodas) {
      sql = ' AND i.use_emno = ? ';
      params.push(req.user.ter_cote);
    }

    const [rows] = await pool.query(
      `SELECT i.ter_cote,
              c.ter_deno AS cliente_nombre,
              COUNT(*) AS total_incidencias,
              MAX(i.fe_regi) AS ultima_visita,
              MIN(i.fe_regi) AS primera_visita,
              ROUND(DATEDIFF(MAX(i.fe_regi), MIN(i.fe_regi)) / GREATEST(COUNT(*) - 1, 1)) AS promedio_dias,
              SUM(CASE WHEN i.fe_regi >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS ultimo_30dias
       FROM incidencias i
       LEFT JOIN clientes c ON c.ter_cote = i.ter_cote
       WHERE i.ter_cote IS NOT NULL ${sql}
       GROUP BY i.ter_cote, c.ter_deno
       ORDER BY ultima_visita DESC
       LIMIT 15`,
      params
    );

    // Totales generales
    const [tot] = await pool.query(
      `SELECT COUNT(*) AS total_incidencias,
              COUNT(DISTINCT ter_cote) AS clientes_visitados
       FROM incidencias i
       WHERE i.ter_cote IS NOT NULL ${sql}`,
      params
    );

    res.json({ resumen: rows, totales: tot[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;