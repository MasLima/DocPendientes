const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { cargarPermisos } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { use_logi, use_pass } = req.body;
  if (!use_logi || !use_pass) {
    return res.status(400).json({ error: 'Se requiere login y password' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.ter_cote, u.use_logi, u.use_pass, u.use_name, u.use_apel, u.activo, u.rol,
              v.ter_deno AS vendedor_nombre
       FROM usuarios_app u
       LEFT JOIN vendedores v ON v.ter_cote = u.ter_cote
       WHERE u.use_logi = ? AND u.activo = 1`,
      [use_logi]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const usuario = rows[0];
    const ok = await bcrypt.compare(use_pass, usuario.use_pass);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    const infoPermisos = await cargarPermisos(usuario.id);

    const payload = {
      id: usuario.id,
      ter_cote: usuario.ter_cote,
      use_logi: usuario.use_logi,
      nombre: `${usuario.use_name || ''} ${usuario.use_apel || ''}`.trim(),
      rol: infoPermisos ? infoPermisos.rol : usuario.rol,
      permisos: infoPermisos ? infoPermisos.permisos : []
    };

    const token = jwt.sign(
      { id: payload.id, ter_cote: payload.ter_cote, use_logi: payload.use_logi, nombre: payload.nombre },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '12h' }
    );

    res.json({ token, usuario: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;