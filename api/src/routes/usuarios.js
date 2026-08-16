const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requirePermiso } = require('../middleware/permisos');

// Lista de usuarios (solo admin). Incluye el vendedor asignado.
router.get('/', requirePermiso('config.usuarios'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.ter_cote, u.use_logi, u.use_name, u.use_apel,
              u.rol, u.activo, u.fecha_registro, u.permisos,
              v.ter_deno AS vendedor_nombre
       FROM usuarios_app u
       LEFT JOIN vendedores v ON v.ter_cote = u.ter_cote
       ORDER BY u.use_logi`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Vendedores disponibles del ERP para asignar a un nuevo usuario.
// Solo los que aun no tienen usuario o que el admin quiera reasignar.
router.get('/vendedores-disponibles', requirePermiso('config.usuarios'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT v.ter_cote, v.ter_deno,
              (SELECT COUNT(*) FROM usuarios_app u WHERE u.ter_cote = v.ter_cote) AS tiene_usuario
       FROM vendedores v
       ORDER BY v.ter_deno`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario. El vendedor debe existir en el ERP (tabla vendedores).
// Body: { ter_cote, use_logi, use_pass, use_name, use_apel, rol, permisos? }
router.post('/', requirePermiso('config.usuarios'), async (req, res) => {
  const { ter_cote, use_logi, use_pass, use_name, use_apel, rol = 'vendedor', permisos = null } = req.body;

  if (!ter_cote || !use_logi || !use_pass) {
    return res.status(400).json({ error: 'Se requiere ter_cote, use_logi y use_pass' });
  }
  if (!['admin', 'empleado', 'vendedor'].includes(rol)) {
    return res.status(400).json({ error: 'Rol invalido' });
  }

  try {
    // El vendedor debe existir en el ERP (tabla vendedores sincronizada)
    const [vend] = await pool.query('SELECT ter_cote FROM vendedores WHERE ter_cote = ?', [ter_cote]);
    if (vend.length === 0) {
      return res.status(400).json({ error: 'El vendedor no existe en el ERP (tabla vendedores)' });
    }

    const hash = await bcrypt.hash(use_pass, 10);
    const [result] = await pool.query(
      `INSERT INTO usuarios_app (ter_cote, use_logi, use_pass, use_name, use_apel, rol, permisos)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ter_cote, use_logi, hash, use_name || null, use_apel || null, rol, permisos]
    );
    res.status(201).json({ id: result.insertId, message: 'Usuario creado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El login ya existe' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar usuario (perfil, rol, permisos, desactivar).
// Body opcional: { use_name, use_apel, rol, activo, permisos, use_pass }
router.put('/:id', requirePermiso('config.usuarios'), async (req, res) => {
  const { use_name, use_apel, rol, activo, permisos, use_pass } = req.body;
  const id = req.params.id;

  try {
    const [exist] = await pool.query('SELECT id FROM usuarios_app WHERE id = ?', [id]);
    if (exist.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const sets = [];
    const params = [];

    if (use_name !== undefined) { sets.push('use_name = ?'); params.push(use_name); }
    if (use_apel !== undefined) { sets.push('use_apel = ?'); params.push(use_apel); }
    if (rol !== undefined) {
      if (!['admin', 'empleado', 'vendedor'].includes(rol)) {
        return res.status(400).json({ error: 'Rol invalido' });
      }
      sets.push('rol = ?'); params.push(rol);
    }
    if (activo !== undefined) { sets.push('activo = ?'); params.push(activo ? 1 : 0); }
    if (permisos !== undefined) { sets.push('permisos = ?'); params.push(permisos); }
    if (use_pass) {
      const hash = await bcrypt.hash(use_pass, 10);
      sets.push('use_pass = ?'); params.push(hash);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    params.push(id);
    await pool.query(`UPDATE usuarios_app SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Desactivar usuario (no se elimina para mantener historial)
router.delete('/:id', requirePermiso('config.usuarios'), async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE usuarios_app SET activo = 0 WHERE id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ message: 'Usuario desactivado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;