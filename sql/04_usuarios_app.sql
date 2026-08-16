-- ============================================================
-- 04_usuarios_app.sql
-- Usuarios de la app (autenticacion propia, no toca el ERP).
-- Ejecutar con la BD cobranza_app activa.
-- ============================================================

USE cobranza_app;

DROP TABLE IF EXISTS usuarios_app;
CREATE TABLE usuarios_app (
  id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ter_cote      VARCHAR(6)  NOT NULL COMMENT 'Vendedor asociado (vendedores.ter_cote)',
  use_logi      VARCHAR(20) NOT NULL COMMENT 'Login',
  use_pass      VARCHAR(100) NOT NULL COMMENT 'Password (hash bcrypt)',
  use_name      VARCHAR(50)  NULL COMMENT 'Nombres',
  use_apel      VARCHAR(50)  NULL COMMENT 'Apellidos',
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_logi (use_logi)
) ENGINE=InnoDB;

-- NOTA: el usuario de prueba se crea con:
--   npm run seed   (en la carpeta api)
-- login: vendedor01 / clave: 123456
