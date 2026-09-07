-- Agregar columna ite_codi (Codigo Alterno) a la tabla articulos
ALTER TABLE articulos ADD COLUMN ite_codi VARCHAR(30) NULL COMMENT 'Codigo alterno (ite_coin del ERP)' AFTER ite_item;
