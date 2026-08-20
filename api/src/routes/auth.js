const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { cargarPermisos } = require('../middleware/auth');

// Verifica la clave contra el hash almacenado.
// Soporta bcrypt (prefijo $2) y hashes legados SHA1 del ERP (40 hex).
// Si el hash es SHA1 y la clave coincide, la migra a bcrypt.
async function verificarClave(use_logi, use_pass, use_pass_ingresada) {
  if (!use_pass) return false;

  if (use_pass.startsWith('$2')) {
    return bcrypt.compare(use_pass_ingresada, use_pass);
  }

  if (/^[0-9a-fA-F]{40}$/.test(use_pass)) {
    const sha1 = crypto.createHash('sha1').update(use_pass_ingresada).digest('hex');
    if (sha1.toLowerCase() !== use_pass.toLowerCase()) return false;
    // Migrar a bcrypt para los siguientes logins.
    const nuevo = await bcrypt.hash(use_pass_ingresada, 10);
    await pool.query('UPDATE usuarios_app SET use_pass = ? WHERE use_logi = ?', [nuevo, use_logi]);
    return true;
  }

  return false;
}

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
    const ok = await verificarClave(usuario.use_logi, usuario.use_pass, use_pass);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales invalidas. Si es tu primer ingreso, usa tu usuario y contraseña del ERP.' });
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