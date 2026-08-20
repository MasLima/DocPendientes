-- ============================================================
-- Perfiles (roles) por area del ERP
-- mplter001.ter_area -> mplcom016.com_area
--   100001 Gerencia      -> gerencia      (acceso total)
--   100002 Tesoreria     -> empleado      (perfil empleado actual)
--   100003 Contabilidad  -> contabilidad  (clientes + reportes, sin procesos/incidencias)
--   100004 Ventas        -> vendedor      (perfil vendedor actual)
--   100008 Sistemas      -> sistemas      (administrador, acceso total)
-- 'admin' se reserva para administradores manuales (no en el ERP).
-- ============================================================

-- Catalogos de permisos (idempotente)
INSERT IGNORE INTO permisos (codigo, descripcion, modulo) VALUES
  ('clientes.ver',      'Ver la lista de clientes', 'clientes'),
  ('clientes.ver_todos','Ver clientes de todos los vendedores', 'clientes'),
  ('clientes.detalle',  'Ver detalle de un cliente', 'clientes'),
  ('documentos.ver',    'Ver documentos pendientes', 'documentos'),
  ('incidencias.ver',       'Ver historial de incidencias', 'incidencias'),
  ('incidencias.ver_todas', 'Ver incidencias de todos los vendedores', 'incidencias'),
  ('incidencias.crear',     'Registrar una incidencia', 'incidencias'),
  ('reportes.saldos',   'Ver reporte de saldos por cliente', 'reportes'),
  ('reportes.vendedor', 'Ver reporte de saldos por vendedor', 'reportes'),
  ('dashboard.ver',     'Ver el dashboard', 'dashboard'),
  ('sync.ejecutar',     'Ejecutar sincronizacion manual', 'sync'),
  ('sync.ver_log',      'Ver el log de sincronizacion', 'sync'),
  ('config.ver',        'Ver la pantalla de configuracion', 'config'),
  ('config.usuarios',   'Gestionar usuarios (crear/editar/desactivar)', 'config'),
  ('config.datos',      'Editar datos de configuracion', 'config'),
  ('config.permisos',   'Editar permisos de usuarios', 'config');

-- Admin (acceso total) - admins manuales
DELETE FROM roles_permisos WHERE rol = 'admin';
INSERT INTO roles_permisos (rol, permiso)
SELECT 'admin', codigo FROM permisos;

-- Gerencia (acceso total)
DELETE FROM roles_permisos WHERE rol = 'gerencia';
INSERT INTO roles_permisos (rol, permiso)
SELECT 'gerencia', codigo FROM permisos;

-- Sistemas (administrador, acceso total)
DELETE FROM roles_permisos WHERE rol = 'sistemas';
INSERT INTO roles_permisos (rol, permiso)
SELECT 'sistemas', codigo FROM permisos;

-- Empleado (Tesoreria): perfil empleado actual
DELETE FROM roles_permisos WHERE rol = 'empleado';
INSERT INTO roles_permisos (rol, permiso)
SELECT 'empleado', codigo FROM permisos
WHERE codigo IN ('clientes.ver','clientes.ver_todos','clientes.detalle',
                 'documentos.ver',
                 'incidencias.ver','incidencias.ver_todas','incidencias.crear',
                 'reportes.saldos','reportes.vendedor',
                 'dashboard.ver');

-- Vendedor (Ventas): perfil vendedor actual
DELETE FROM roles_permisos WHERE rol = 'vendedor';
INSERT INTO roles_permisos (rol, permiso)
SELECT 'vendedor', codigo FROM permisos
WHERE codigo IN ('clientes.ver','clientes.detalle',
                 'documentos.ver',
                 'incidencias.ver','incidencias.crear',
                 'reportes.saldos',
                 'dashboard.ver');

-- Contabilidad: clientes + reportes + dashboard. Sin procesos (documentos),
-- sin incidencias, sin config ni sync.
DELETE FROM roles_permisos WHERE rol = 'contabilidad';
INSERT INTO roles_permisos (rol, permiso)
SELECT 'contabilidad', codigo FROM permisos
WHERE codigo IN ('clientes.ver','clientes.ver_todos','clientes.detalle',
                 'reportes.saldos','reportes.vendedor',
                 'dashboard.ver');

-- ============================================================
-- usuarios_app: columna 'origen' para distinguir ERP / MANUAL.
-- ============================================================
SET @existe = (SELECT COUNT(*) FROM information_schema.columns
               WHERE table_schema = DATABASE()
                 AND table_name = 'usuarios_app'
                 AND column_name = 'origen');
SET @sql = IF(@existe = 0,
  'ALTER TABLE usuarios_app ADD COLUMN origen VARCHAR(10) NOT NULL DEFAULT ''MANUAL'' COMMENT ''ERP|MANUAL''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Los usuarios con ter_cote <> '0' sincronizados antes quedan marcados como ERP
UPDATE usuarios_app SET origen = 'ERP' WHERE ter_cote <> '0' AND origen = 'MANUAL';