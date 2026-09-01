-- Agregar columnas de unidades a tabla articulos
-- Ejecutar en MySQL Workbench en la BD cobranza_app

ALTER TABLE articulos
  ADD COLUMN uventa_desc   VARCHAR(50) NULL AFTER importe_compra,
  ADD COLUMN ucompra_desc  VARCHAR(50) NULL AFTER uventa_desc,
  ADD COLUMN ustock_desc   VARCHAR(50) NULL AFTER ucompra_desc,
  ADD COLUMN uventa_abrev  VARCHAR(4)  NULL AFTER ustock_desc,
  ADD COLUMN ucompra_abrev VARCHAR(4)  NULL AFTER uventa_abrev,
  ADD COLUMN ustock_abrev  VARCHAR(4)  NULL AFTER ucompra_abrev;
