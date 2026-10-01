-- ============================================================
-- 14_permisos_nuevos.sql
-- Permisos nuevos para la web (agregados, no borra nada):
--   - vencimientos.config: ver/configurar/editar rangos de vencimiento
--   - incidencias.editar:  editar incidencias registradas (web y movil)
--   - incidencias.todas:   buscar/registrar incidencias fuera de la cartera
-- Los grants se derivan de los permisos equivalentes que ya existian,
-- para conservar exactamente el comportamiento actual de cada perfil.
-- Idempotente: se puede ejecutar mas de una vez (INSERT IGNORE).
-- ============================================================

INSERT IGNORE INTO permisos (codigo, descripcion, modulo) VALUES
  ('vencimientos.config', 'Configurar y editar rangos de vencimiento', 'vencimientos'),
  ('incidencias.editar',  'Editar incidencias registradas',            'incidencias'),
  ('incidencias.todas',   'Buscar y registrar incidencias en clientes fuera de su cartera', 'incidencias');

-- vencimientos.config: para quien hoy puede ver config (config.ver)
-- (antes el API de rangos exigia config.ver implicitamente).
INSERT IGNORE INTO roles_permisos (rol, permiso)
SELECT DISTINCT rol, 'vencimientos.config'
FROM roles_permisos
WHERE permiso = 'config.ver';

-- incidencias.editar: para quien hoy puede crear incidencias.
INSERT IGNORE INTO roles_permisos (rol, permiso)
SELECT DISTINCT rol, 'incidencias.editar'
FROM roles_permisos
WHERE permiso = 'incidencias.crear';

-- incidencias.todas: para quien hoy puede crear incidencias
-- (el ?todos=1 del buscador no tenia control de permiso hasta ahora).
INSERT IGNORE INTO roles_permisos (rol, permiso)
SELECT DISTINCT rol, 'incidencias.todas'
FROM roles_permisos
WHERE permiso = 'incidencias.crear';

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT codigo, descripcion, modulo
FROM permisos
WHERE codigo IN ('vencimientos.config', 'incidencias.editar', 'incidencias.todas')
ORDER BY modulo, codigo;

SELECT rol, permiso
FROM roles_permisos
WHERE permiso IN ('vencimientos.config', 'incidencias.editar', 'incidencias.todas')
ORDER BY rol, permiso;
