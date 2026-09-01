-- ============================================================
-- Tabla de articulos (catalogo de productos)
-- Sincronizado desde el ERP:
--   mplite001 (items), mplite003 (lineas), mplite005 (unidades),
--   mplite011 (estados), mplite014 (familias),
--   mlosto050 (stock), mlosto040 (ultima compra).
-- Solo lectura: los datos se actualizan via syncArticulos().
-- ============================================================

CREATE TABLE IF NOT EXISTS articulos (
  ite_item      VARCHAR(20) NOT NULL PRIMARY KEY COMMENT 'Codigo del articulo',
  ite_dsit      VARCHAR(100) NULL COMMENT 'Descripcion',
  ite_dste      TEXT NULL COMMENT 'Descripcion larga',
  ite_uven      VARCHAR(3) NULL COMMENT 'Codigo unidad venta',
  ite_ucom      VARCHAR(3) NULL COMMENT 'Codigo unidad compra',
  ite_usto      VARCHAR(3) NULL COMMENT 'Codigo unidad stock',
  ite_imag      VARCHAR(90) NULL COMMENT 'Nombre imagen',
  ite_coar      VARCHAR(13) NULL COMMENT 'Codigo de parte',
  ite_coli      VARCHAR(6) NULL COMMENT 'Codigo linea',
  ite_cofa      VARCHAR(6) NULL COMMENT 'Codigo familia',
  ite_esta      VARCHAR(2) NULL COMMENT 'Codigo estado',
  ite_pruv      DOUBLE NULL COMMENT 'Importe ultima venta',
  ite_feuv      DATE NULL COMMENT 'Fecha ultima venta',
  ite_copr      DOUBLE NULL COMMENT 'Costo en soles',
  ite_codl      DOUBLE NULL COMMENT 'Costo en dolares',
  saldo         DOUBLE NULL DEFAULT 0 COMMENT 'Saldo actual (stock)',
  linea_desc    VARCHAR(60) NULL COMMENT 'Descripcion linea (mplite003)',
  familia_desc  VARCHAR(120) NULL COMMENT 'Descripcion familia (mplite014)',
  unidad_desc   VARCHAR(50) NULL COMMENT 'Descripcion unidad stock (mplite005)',
  estado_desc   VARCHAR(50) NULL COMMENT 'Descripcion estado (mplite011)',
  fecha_compra  DATE NULL COMMENT 'Fecha de ultima compra',
  importe_compra DOUBLE NULL COMMENT 'Importe de ultima compra',
  uventa_desc   VARCHAR(50) NULL COMMENT 'Descripcion unidad venta (mplite005)',
  ucompra_desc  VARCHAR(50) NULL COMMENT 'Descripcion unidad compra (mplite005)',
  ustock_desc   VARCHAR(50) NULL COMMENT 'Descripcion unidad stock (mplite005)',
  uventa_abrev  VARCHAR(4) NULL COMMENT 'Abreviatura unidad venta (mplite005)',
  ucompra_abrev VARCHAR(4) NULL COMMENT 'Abreviatura unidad compra (mplite005)',
  ustock_abrev  VARCHAR(4) NULL COMMENT 'Abreviatura unidad stock (mplite005)',
  ultima_sync   DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indices para busquedas y filtros
CREATE INDEX IF NOT EXISTS idx_articulos_linea ON articulos(ite_coli);
CREATE INDEX IF NOT EXISTS idx_articulos_familia ON articulos(ite_cofa);
CREATE INDEX IF NOT EXISTS idx_articulos_estado ON articulos(ite_esta);
