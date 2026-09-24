-- ============================================================
-- 12_vencimientos_whatsapp.sql
-- Tablas para sistema de vencimientos y envío por WhatsApp
-- ============================================================

-- Configuracion de rangos de vencimiento (editable)
DROP TABLE IF EXISTS config_vencimientos;
CREATE TABLE config_vencimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL,
  etiqueta VARCHAR(100) NOT NULL,
  dias_desde INT NOT NULL,
  dias_hasta INT NOT NULL,
  orden INT DEFAULT 0,
  activo TINYINT(1) DEFAULT 1,
  mensaje_template TEXT NOT NULL,
  UNIQUE KEY (nombre)
) ENGINE=InnoDB;

INSERT INTO config_vencimientos (nombre, etiqueta, dias_desde, dias_hasta, orden, mensaje_template) VALUES
('7_dias_antes',    '7 días antes de vencer',        -7,  -5, 1, 'Estimado *{nombre}*, le recordamos que su documento *{doc}* vence el {fecha} por S/ {saldo}. Agradecemos su puntualidad.'),
('5_dias_antes',    '5 días antes de vencer',        -5,  -3, 2, 'Estimado *{nombre}*, le informamos que su documento *{doc}* vence en {dias} días ({fecha}) por S/ {saldo}.'),
('dia_vencimiento', 'Día de vencimiento',              0,   0, 3, 'Estimado *{nombre}*, su documento *{doc}* vence HOY por S/ {saldo}. Le solicitamos regularizar su pago.'),
('2_dias_vencido',  '1-3 días vencido',                1,   3, 4, 'Estimado *{nombre}*, su documento *{doc}* se encuentra vencido desde hace {dias} días por S/ {saldo}. Le rogamos regularizar.'),
('7_dias_vencido',  '4-7 días vencido',                4,   7, 5, 'Estimado *{nombre}*, su documento *{doc}* lleva {dias} días vencido por S/ {saldo}. Por favor regularizar a la brevedad.'),
('8_30_dias_vencido', '8-30 días vencido',             8,  30, 6, 'Estimado *{nombre}*, su documento *{doc}* lleva {dias} días vencido por S/ {saldo}. Le solicitamos urgente regularización.');

-- Control de envíos por WhatsApp
DROP TABLE IF EXISTS whatsapp_envios;
CREATE TABLE whatsapp_envios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ter_cote VARCHAR(6) NOT NULL,
  cob_tivo VARCHAR(2) NULL,
  cob_nuvo VARCHAR(10) NULL,
  cob_codo VARCHAR(3) NULL,
  cob_seri VARCHAR(5) NULL,
  cob_nums VARCHAR(12) NULL,
  telefono VARCHAR(20) NULL,
  rango VARCHAR(50) NULL,
  mensaje TEXT NULL,
  fecha_envio DATETIME NULL,
  enviado_por INT NULL,
  INDEX idx_envio_cliente (ter_cote),
  INDEX idx_envio_doc (cob_tivo, cob_nuvo),
  INDEX idx_envio_fecha (fecha_envio)
) ENGINE=InnoDB;
