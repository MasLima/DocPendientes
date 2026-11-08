-- ============================================================
-- 15_gps_incidencias.sql
-- GPS de visitas:
--   (1) Coordenadas de cada incidencia (visita).
--   (2) Tabla aparte cliente_ubicaciones con el punto de referencia
--       de cada cliente (sobrevive al REPLACE INTO del sync de
--       clientes, por eso NO van sobre la tabla clientes).
--   (3) config_gps: umbrales configurables (default 300 m, tope).
--   (4) Permiso 'mapas.ver' (mapas web de clientes y vendedores),
--       otorgado a admin, gerencia y sistemas.
-- Idempotente: se puede re-ejecutar sin danar datos.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Coordenadas de la visita en cada incidencia
-- ------------------------------------------------------------
SET @existe_lat := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'inc_lat');
SET @sql := IF(@existe_lat = 0,
  'ALTER TABLE incidencias ADD COLUMN inc_lat DECIMAL(10,7) NULL AFTER sincronizada',
  'SELECT "inc_lat ya existe" AS aviso');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'inc_lng');
SET @sql := IF(@existe = 0,
  'ALTER TABLE incidencias ADD COLUMN inc_lng DECIMAL(10,7) NULL AFTER inc_lat',
  'SELECT "inc_lng ya existe" AS aviso');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'inc_gps_acc');
SET @sql := IF(@existe = 0,
  'ALTER TABLE incidencias ADD COLUMN inc_gps_acc INT NULL AFTER inc_lng',
  'SELECT "inc_gps_acc ya existe" AS aviso');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias' AND COLUMN_NAME = 'inc_gps_fec');
SET @sql := IF(@existe = 0,
  'ALTER TABLE incidencias ADD COLUMN inc_gps_fec DATETIME NULL AFTER inc_gps_acc',
  'SELECT "inc_gps_fec ya existe" AS aviso');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2) Punto de referencia del cliente (tabla aparte, no la toca el sync)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente_ubicaciones (
  ter_cote     VARCHAR(20) NOT NULL PRIMARY KEY,
  lat          DECIMAL(10,7) NOT NULL,
  lng          DECIMAL(10,7) NOT NULL,
  gps_acc      INT NULL,
  actualizado  DATETIME NOT NULL,
  visitas      INT NOT NULL DEFAULT 1,
  umbral_m     INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3) Configuracion global de GPS (clave/valor)
--    umbral_global: distancia maxima para considerar "en el local"
--    umbral_tope  : maximo aceptado para ACTUALIZAR una referencia
--                   (si la nueva posicion queda a mas de esto, la
--                   API no mueve el punto aunque el vendedor confirme)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config_gps (
  clave VARCHAR(30) NOT NULL PRIMARY KEY,
  valor VARCHAR(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO config_gps (clave, valor) VALUES
  ('umbral_global', '300'),
  ('umbral_tope',   '2000');

-- ------------------------------------------------------------
-- 4) Nuevo permiso: mapas.ver (catalogo 23 -> 24)
-- ------------------------------------------------------------
INSERT IGNORE INTO permisos (codigo, descripcion, modulo) VALUES
  ('mapas.ver', 'Ver mapas de ubicaciones (clientes y vendedores)', 'mapas');

-- Grants iniciales: admin, gerencia y sistemas.
-- (Ajustable despues desde la pantalla Perfiles.)
INSERT IGNORE INTO roles_permisos (rol, permiso)
SELECT rol, 'mapas.ver'
FROM (SELECT 'admin' AS rol UNION SELECT 'gerencia' UNION SELECT 'sistemas') r
WHERE EXISTS (SELECT 1 FROM roles_permisos x WHERE x.rol = r.rol);

-- ------------------------------------------------------------
-- Verificacion
-- ------------------------------------------------------------
SELECT COUNT(*) AS columnas_gps FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'incidencias'
    AND COLUMN_NAME IN ('inc_lat','inc_lng','inc_gps_acc','inc_gps_fec');

SELECT * FROM config_gps;

SELECT codigo, descripcion, modulo FROM permisos WHERE codigo = 'mapas.ver';

SELECT rp.rol, rp.permiso FROM roles_permisos rp WHERE rp.permiso = 'mapas.ver';
