const router = require('express').Router();
const pool = require('../config/db');
const { requirePermiso } = require('../middleware/permisos');
const { syncCompleto } = require('../services/syncService');

// Ejecutar la sincronizacion manualmente.
// Solo admin (permiso sync.ejecutar).
// Body opcional: { procesos: ['maestros','condiciones','documentos','incidencias'] }
// Si no se envian procesos, se sincroniza todo.
router.post('/ejecutar', requirePermiso('sync.ejecutar'), async (req, res) => {
  try {
    const procesos = req.body?.procesos;
    const resultados = await syncCompleto(procesos);
    res.json({ message: 'Sincronizacion completada', resultados });
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

module.exports = router;