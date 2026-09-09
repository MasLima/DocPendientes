-- ============================================================
-- Tabla de mensajes WhatsApp enviados
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_mensajes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ter_cote VARCHAR(6) NULL,
  telefono VARCHAR(20) NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  mensaje TEXT NULL,
  imagen_url VARCHAR(500) NULL,
  archivos JSON NULL,
  estado VARCHAR(20) DEFAULT 'enviado',
  error_detalle VARCHAR(500) NULL,
  enviado_por INT NULL,
  fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wa_cliente (ter_cote),
  INDEX idx_wa_fecha (fecha_envio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Permisos WhatsApp
INSERT IGNORE INTO permisos (codigo, descripcion, modulo) VALUES
('whatsapp.ver', 'Ver estado de WhatsApp', 'whatsapp'),
('whatsapp.enviar', 'Enviar mensajes WhatsApp', 'whatsapp');

-- Asignar permisos a admin
INSERT INTO roles_permisos (rol, permiso)
SELECT 'admin', codigo FROM permisos WHERE codigo IN ('whatsapp.ver', 'whatsapp.enviar');

-- Agregar columna telefono_origen si no existe
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_mensajes' AND COLUMN_NAME = 'telefono_origen'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE whatsapp_mensajes ADD COLUMN telefono_origen VARCHAR(20) NULL AFTER enviado_por',
  'SELECT "Columna telefono_origen ya existe"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
