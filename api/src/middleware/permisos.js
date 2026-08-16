// Middleware para exigir un permiso concreto en una ruta.
// Uso: router.get('/', requirePermiso('clientes.ver'), handler)
function requirePermiso(permiso) {
  return (req, res, next) => {
    if (!req.user || !req.user.permisos) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (req.user.permisos.includes(permiso)) {
      return next();
    }
    return res.status(403).json({
      error: 'No tienes permisos para esta opcion',
      permiso
    });
  };
}

module.exports = { requirePermiso };