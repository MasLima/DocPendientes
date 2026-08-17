const router = require('express').Router();
const pool = require('../config/db');
const { requirePermiso } = require('../middleware/permisos');

// Perfiles (roles) con sus permisos y el catálogo de permisos por módulo.
router.get('/', async (req, res) => {
  try {
    const [permisos] = await pool.query(
      `SELECT codigo, descripcion, modulo FROM permisos ORDER BY modulo, codigo`
    );
    const [roles] = await pool.query(`SELECT DISTINCT rol FROM roles_permisos ORDER BY rol`);
    const [rp] = await pool.query(`SELECT rol, permiso FROM roles_permisos ORDER BY rol, permiso`);

    const porModulo = permisos.reduce((acc, p) => {
      if (!acc[p.modulo]) acc[p.modulo] = [];
      acc[p.modulo].push({ codigo: p.codigo, descripcion: p.descripcion });
      return acc;
    }, {});

    const porRol = {};
    for (const r of rp) {
      if (!porRol[r.rol]) porRol[r.rol] = [];
      porRol[r.rol].push(r.permiso);
    }

    const perfiles = roles.map((r) => ({
      rol: r.rol,
      permisos: porRol[r.rol] || []
    }));

    res.json({ perfiles, modulos: porModulo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar los permisos de un perfil (solo admin).
router.put('/:rol', requirePermiso('config.permisos'), async (req, res) => {
  const rol = req.params.rol;
  const { permisos } = req.body;
  if (!Array.isArray(permisos)) {
    return res.status(400).json({ error: 'Se requiere un arreglo de permisos' });
  }

  const conn = await pool.getConnection();
  try {
    const [valido] = await conn.query(
      `SELECT COUNT(*) AS n FROM permisos WHERE codigo IN (${permisos.map(() => '?').join(',')})`,
      permisos
    );
    if (valido[0].n !== permisos.length) {
      conn.release();
      return res.status(400).json({ error: 'Algun permiso no existe' });
    }

    await conn.beginTransaction();
    await conn.query('DELETE FROM roles_permisos WHERE rol = ?', [rol]);
    for (const p of permisos) {
      await conn.query('INSERT INTO roles_permisos (rol, permiso) VALUES (?, ?)', [rol, p]);
    }
    await conn.commit();
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    conn.release();
  }
});

module.exports = router;