const router = require('express').Router();
const pool = require('../config/db');
const { requirePermiso } = require('../middleware/permisos');
const { syncCompleto } = require('../services/syncService');

// Ejecutar la sincronizacion manualmente.
// Solo admin (permiso sync.ejecutar).
// Body opcional:
//   { procesos: ['maestros','condiciones',...], modo: 'parcial'|'completo' }
// - 'parcial' (default): REPLACE INTO, actualiza sin eliminar huérfanos.
// - 'completo': DELETE + INSERT, limpia la BD y reemplaza con datos del ERP.
router.post('/ejecutar', requirePermiso('sync.ejecutar'), async (req, res) => {
  try {
    const procesos = req.body?.procesos;
    const modo = req.body?.modo || 'parcial';
    const resultados = await syncCompleto(procesos, modo);
    res.json({ message: 'Sincronizacion completada', modo, resultados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en la sincronizacion', detalle: err.message });
  }
});

// Ver el log de sincronizaciones
router.get('/log', requirePermiso('sync.ver_log'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, proceso, fecha, filas, resultado, detalle
       FROM sync_log
       ORDER BY id DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Estado de la ultima sincronizacion por proceso.
router.get('/estado', requirePermiso('sync.ver_log'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.proceso, s.fecha, s.filas, s.resultado, s.detalle
       FROM sync_log s
       INNER JOIN (
         SELECT proceso, MAX(id) AS max_id
         FROM sync_log
         GROUP BY proceso
       ) ultimo ON s.id = ultimo.max_id
       ORDER BY s.proceso`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
