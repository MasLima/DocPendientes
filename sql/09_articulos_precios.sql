-- ============================================================
-- Tabla de precios de artículos (lista de precios)
-- Sincronizado desde el ERP: mplven010
-- Solo para artículos existentes en la tabla articulos.
-- Solo lectura: los datos se actualizan via syncPrecios().
-- ============================================================

CREATE TABLE IF NOT EXISTS articulos_precios (
  ven_item      VARCHAR(20) NOT NULL COMMENT 'Codigo del articulo',
  ven_cota      VARCHAR(3) NOT NULL COMMENT 'Codigo tipo precio (101/102/103)',
  ven_pric      DOUBLE NULL COMMENT 'Precio base (no se usa)',
  ven_pigv      DOUBLE NULL COMMENT 'Precio con IGV (campo a mostrar)',
  PRIMARY KEY (ven_item, ven_cota)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
