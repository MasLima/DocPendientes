-- ============================================================
-- 04_usuarios_app.sql
-- Usuarios de la app (autenticacion propia, no toca el ERP).
-- Ejecutar con la BD cobranza_app activa.
-- Actualizado para incluir columna 'origen' y 'rol'.
-- ============================================================

USE cobranza_app;

DROP TABLE IF EXISTS usuarios_app;

CREATE TABLE usuarios_app (
  id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ter_cote      VARCHAR(6)  NOT NULL DEFAULT '0' COMMENT 'Vendedor asociado (vendedores.ter_cote)',
  use_logi      VARCHAR(20) NOT NULL COMMENT 'Login',
  use_pass      VARCHAR(100) NOT NULL COMMENT 'Password (hash bcrypt)',
  use_name      VARCHAR(50)  NULL COMMENT 'Nombres',
  use_apel      VARCHAR(50)  NULL COMMENT 'Apellidos',
  rol           VARCHAR(20)  NOT NULL DEFAULT 'vendedor' COMMENT 'Rol: admin, gerencia, sistemas, empleado, contabilidad, vendedor',
  permisos      JSON         NULL COMMENT 'Permisos personalizados del usuario (suman/restan del rol)',
  origen        VARCHAR(10)  NOT NULL DEFAULT 'MANUAL' COMMENT 'Origen: MANUAL o ERP',
  activo        TINYINT(1) NOT NULL DEFAULT 1,
  fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_logi (use_logi)
) ENGINE=InnoDB;

-- NOTA: los usuarios de prueba se crean con:
--   cd api && node seed.js   (en la carpeta del proyecto)
-- login: admin01 / clave: 123456

