const router = require('express').Router();
const pool = require('../config/db');
const { requirePermiso } = require('../middleware/permisos');

// GET /api/config/vencimientos — listar rangos configurados
router.get('/', requirePermiso('config.ver'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM config_vencimientos ORDER BY orden, id'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/config/vencimientos — crear nuevo rango
router.post('/', requirePermiso('config.ver'), async (req, res) => {
  const { nombre, etiqueta, dias_desde, dias_hasta, orden, mensaje_template } = req.body;
  if (!nombre || !etiqueta || dias_desde == null || dias_hasta == null || !mensaje_template) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  try {
    const maxOrden = await pool.query('SELECT COALESCE(MAX(orden),0)+1 AS next FROM config_vencimientos');
    const [result] = await pool.query(
      `INSERT INTO config_vencimientos (nombre, etiqueta, dias_desde, dias_hasta, orden, mensaje_template)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, etiqueta, dias_desde, dias_hasta, orden || maxOrden[0][0].next, mensaje_template]
    );
    res.status(201).json({ id: result.insertId, message: 'Rango creado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un rango con ese nombre' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/config/vencimientos/:id — actualizar rango
router.put('/:id', requirePermiso('config.ver'), async (req, res) => {
  const { etiqueta, dias_desde, dias_hasta, orden, activo, mensaje_template } = req.body;
  try {
    const campos = [];
    const valores = [];
    if (etiqueta != null) { campos.push('etiqueta = ?'); valores.push(etiqueta); }
    if (dias_desde != null) { campos.push('dias_desde = ?'); valores.push(dias_desde); }
    if (dias_hasta != null) { campos.push('dias_hasta = ?'); valores.push(dias_hasta); }
    if (orden != null) { campos.push('orden = ?'); valores.push(orden); }
    if (activo != null) { campos.push('activo = ?'); valores.push(activo); }
    if (mensaje_template != null) { campos.push('mensaje_template = ?'); valores.push(mensaje_template); }
    if (campos.length === 0) return res.status(400).json({ error: 'Sin cambios' });
    valores.push(req.params.id);
    await pool.query(`UPDATE config_vencimientos SET ${campos.join(', ')} WHERE id = ?`, valores);
    res.json({ message: 'Rango actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/config/vencimientos/:id — eliminar rango
router.delete('/:id', requirePermiso('config.ver'), async (req, res) => {
  try {
    await pool.query('DELETE FROM config_vencimientos WHERE id = ?', [req.params.id]);
    res.json({ message: 'Rango eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
