const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Carga los permisos efectivos del usuario:
//   - los del rol (roles_permisos)
//   - + los personalizados (usuarios_app.permisos JSON, si existe)
async function cargarPermisos(userId) {
  const [rows] = await pool.query(
    `SELECT u.rol, u.permisos
     FROM usuarios_app u
     WHERE u.id = ? AND u.activo = 1`,
    [userId]
  );
  if (rows.length === 0) return null;

  const { rol, permisos } = rows[0];

  const [rp] = await pool.query(
    `SELECT p.codigo
     FROM roles_permisos rp
     JOIN permisos p ON p.codigo = rp.permiso
     WHERE rp.rol = ?`,
    [rol]
  );

  const efectivos = new Set(rp.map((r) => r.codigo));

  // Permisos personalizados del usuario (pueden sumar o restar)
  if (permisos && Array.isArray(permisos)) {
    for (const p of permisos) {
      if (p.startsWith('-')) efectivos.delete(p.slice(1));
      else efectivos.add(p);
    }
  }

  return { rol, permisos: [...efectivos] };
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No se proporciono token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Recargar rol y permisos desde la BD (siempre actualizados)
    const info = await cargarPermisos(payload.id);
    if (!info) {
      return res.status(401).json({ error: 'Usuario no valido o desactivado' });
    }

    req.user = {
      id: payload.id,
      ter_cote: payload.ter_cote,
      use_logi: payload.use_logi,
      nombre: payload.nombre,
      rol: info.rol,
      permisos: info.permisos
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
}

module.exports = auth;
module.exports.cargarPermisos = cargarPermisos;