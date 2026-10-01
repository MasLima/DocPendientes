-- ============================================================
-- 13_utf8mb4_emojis.sql
-- Diagnóstico y corrección de emojis en incidencias (???)
-- Ejecutar en MySQL Workbench (servidor), base cobranza_app.
-- ============================================================

-- ------------------------------------------------------------
-- 1) DIAGNÓSTICO
-- ------------------------------------------------------------

-- 1a) Charset de la base de datos:
--     Esperado: utf8mb4 / utf8mb4_unicode_ci
SELECT DEFAULT_CHARACTER_SET_NAME AS db_charset,
       DEFAULT_COLLATION_NAME     AS db_collation
FROM information_schema.SCHEMATA
WHERE SCHEMA_NAME = 'cobranza_app';

-- 1b) Tablas que NO están en utf8mb4:
--     Esperado: 0 filas. Si devuelve filas -> ejecutar sección 2.
SELECT TABLE_NAME, TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'cobranza_app'
  AND TABLE_COLLATION NOT LIKE 'utf8mb4%'
ORDER BY TABLE_NAME;

-- 1c) Prueba aislada: ¿qué guarda MySQL realmente?
--     Esperado hex: ...F09F9884F09F9884F09F9884... (los 3 emojis)
--     Si muestra 3F3F3F ('???') => la BD convierte mal los emojis.
CREATE TABLE IF NOT EXISTS _test_emoji (
  id INT NOT NULL PRIMARY KEY,
  t  VARCHAR(100) NULL
) ENGINE=InnoDB;
INSERT INTO _test_emoji (id, t) VALUES (1, 'emoji 😄😄😄 test')
  ON DUPLICATE KEY UPDATE t = 'emoji 😄😄😄 test';
SELECT t AS texto, HEX(t) AS hex FROM _test_emoji WHERE id = 1;
DELETE FROM _test_emoji WHERE id = 1;

-- 1d) Incidencias dañadas (ya guardadas como ???):
--     HEX 3F = '?' => el texto original se perdio al guardar.
SELECT inc_codi, fe_regi, inc_desc, HEX(inc_desc) AS hex
FROM incidencias
WHERE inc_codi_erp IS NULL AND inc_desc LIKE '%?%'
ORDER BY inc_codi DESC
LIMIT 10;

-- ------------------------------------------------------------
-- 2) CORRECCIÓN
--    Ejecutar solo si 1a/1b/1c no dieron utf8mb4 / F09F...
-- ------------------------------------------------------------

-- 2a) La base para las tablas futuras:
ALTER DATABASE cobranza_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2b) Genera el ALTER de cada tabla que no este en utf8mb4:
SET SESSION group_concat_max_len = 1000000;
SET @sql = NULL;
SELECT GROUP_CONCAT(
         CONCAT('ALTER TABLE `', TABLE_NAME,
                '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;')
         SEPARATOR ' ')
       INTO @sql
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'cobranza_app'
  AND TABLE_COLLATION NOT LIKE 'utf8mb4%';

-- 2c) Muestra el script generado:
SELECT @sql AS script_a_ejecutar;

-- 2d) Si script_a_ejecutar NO es NULL, descomentar y ejecutar:
-- PREPARE stmt FROM @sql;
-- EXECUTE stmt;
-- DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3) VERIFICACIÓN
--    Repetir 1b (esperado: 0 filas) y 1c (esperado: F09F...).
--    Luego probar: guardar una incidencia con emoji desde la
--    app/web y volver a abrirla - los emojis deben conservarse.
--    Las incidencias viejas con ??? conservan el ?; se pueden
--    reescribir desde la app (ya existe Editar).
-- ============================================================
