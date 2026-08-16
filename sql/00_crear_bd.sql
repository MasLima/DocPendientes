-- ============================================================
-- 00_crear_bd.sql
-- Crea la base de datos de la app de Cobranza y sus tablas.
-- La BD de la app es independiente del ERP. Los catalogos de
-- monedas y estados se cargan aqui para que la API sea autonoma.
-- El sync con el ERP (scripts 01-03) se conecta a la otra instancia.
-- ============================================================

CREATE DATABASE IF NOT EXISTS cobranza_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cobranza_app;

-- Vendedores (en el ERP son terceros con ter_tite='300000')
DROP TABLE IF EXISTS vendedores;
CREATE TABLE vendedores (
  ter_cote   VARCHAR(6)  NOT NULL PRIMARY KEY COMMENT 'Codigo vendedor (ter_cote del ERP)',
  ter_deno   VARCHAR(100) NULL COMMENT 'Nombre del vendedor',
  use_logi   VARCHAR(10)  NULL COMMENT 'Login en ERP (si aplica)',
  use_emno   VARCHAR(6)   NULL COMMENT 'Codigo empleado ERP',
  ter_stat   VARCHAR(2)   NULL COMMENT 'Estado tercero',
  ter_date   DATE         NULL COMMENT 'Fecha alta',
  ultima_sync DATETIME    NULL
) ENGINE=InnoDB;

-- Clientes (en el ERP son terceros con ter_tite='100000')
-- Anchos de columna calibrados contra mplter001 del ERP.
DROP TABLE IF EXISTS clientes;
CREATE TABLE clientes (
  ter_cote   VARCHAR(6)  NOT NULL PRIMARY KEY COMMENT 'Codigo cliente',
  ter_deno   VARCHAR(100) NULL COMMENT 'Razon social / nombre',
  ter_dire   VARCHAR(180) NULL COMMENT 'Direccion',
  ter_rucn   VARCHAR(20)  NULL COMMENT 'RUC/DNI',
  ter_fono   VARCHAR(20)  NULL COMMENT 'Telefono',
  ter_cell   VARCHAR(20)  NULL COMMENT 'Celular',
  ter_emai   VARCHAR(100) NULL COMMENT 'Email',
  ter_core   VARCHAR(6)   NULL COMMENT 'Vendedor asignado (ter_cote del vendedor)',
  ter_cocp   VARCHAR(3)   NULL COMMENT 'Condicion de pago',
  ter_licr   DOUBLE       NULL COMMENT 'Limite de credito',
  ter_stat   VARCHAR(2)   NULL COMMENT 'Estado tercero',
  ter_cozo   VARCHAR(6)   NULL COMMENT 'Zona',
  ultima_sync DATETIME    NULL,
  INDEX idx_cli_vend (ter_core)
) ENGINE=InnoDB;

-- Documentos pendientes (copia de mficob100 con saldo calculado)
-- La identidad del documento es (cob_codo, cob_seri, cob_nums);
-- un voucher CxC (cob_tivo+cob_nuvo) puede agrupar varios documentos.
DROP TABLE IF EXISTS documentos;
CREATE TABLE documentos (
  cob_tivo   VARCHAR(3)  NULL COMMENT 'Tipo voucher (CxC)',
  cob_nuvo   VARCHAR(8)  NULL COMMENT 'Nro voucher (CxC)',
  cob_codo   VARCHAR(2)  NOT NULL COMMENT 'Tipo documento (factura/NC/ND)',
  cob_seri   VARCHAR(4)  NOT NULL COMMENT 'Serie',
  cob_nums   VARCHAR(20) NOT NULL COMMENT 'Numero',
  cob_cote   VARCHAR(6)  NULL COMMENT 'Cliente',
  cob_feem   DATE        NULL COMMENT 'Fecha emision',
  cob_feve   DATE        NULL COMMENT 'Fecha vencimiento',
  cob_como   VARCHAR(3)  NULL COMMENT 'Moneda',
  cob_core   VARCHAR(6)  NULL COMMENT 'Vendedor responsable',
  cob_cocp   VARCHAR(3)  NULL COMMENT 'Condicion pago',
  cob_stat   VARCHAR(2)  NULL COMMENT 'Estado CxC (mplgen006)',
  doc_impo   DOUBLE(10,2) NULL COMMENT 'Importe total doc (moneda origen)',
  cob_impo   DOUBLE(10,2) NULL COMMENT 'Importe original',
  cob_imps   DOUBLE(10,2) NULL COMMENT 'Importe soles',
  cob_impd   DOUBLE(10,2) NULL COMMENT 'Importe dolares',
  pagado     DOUBLE(10,2) NULL COMMENT 'Suma de pagos aplicados',
  saldo      DOUBLE(10,2) NULL COMMENT 'cob_impo - pagado (pendiente)',
  PRIMARY KEY (cob_codo, cob_seri, cob_nums),
  INDEX idx_doc_cli  (cob_cote),
  INDEX idx_doc_vend (cob_core),
  INDEX idx_doc_stat (cob_stat)
) ENGINE=InnoDB;

-- Incidencias registradas por el vendedor (local) - se envian al ERP
DROP TABLE IF EXISTS incidencias;
CREATE TABLE incidencias (
  inc_codi    INT(10) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  inc_codi_erp INT(10) NULL COMMENT 'ID generado en ERP tras enviar',
  ter_cote    VARCHAR(6) NOT NULL COMMENT 'Cliente',
  use_emno    VARCHAR(6) NULL COMMENT 'Vendedor (codigo empleado)',
  inc_cont    VARCHAR(100) NULL COMMENT 'Contacto cliente',
  inc_desc    TEXT        NULL COMMENT 'Descripcion de la incidencia',
  inc_acci    TEXT        NULL COMMENT 'Acciones tomadas',
  fe_regi     DATE        NULL COMMENT 'Fecha registro',
  fe_aten     DATE        NULL COMMENT 'Proxima fecha de atencion',
  fe_resu     DATE        NULL COMMENT 'Fecha resuelta',
  inc_esta    TINYINT(1)  NULL COMMENT 'Estado visto por vendedor',
  inc_estc    TINYINT(1)  NULL COMMENT 'Estado visto por cliente',
  sincronizada TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=pendiente de envio a ERP, 1=enviada',
  ultima_sync DATETIME    NULL,
  INDEX idx_inc_cli (ter_cote),
  INDEX idx_inc_ven (use_emno),
  INDEX idx_inc_erp (inc_codi_erp)
) ENGINE=InnoDB;

-- Detalle de incidencias (equivalente mcoinci020)
DROP TABLE IF EXISTS incidencia_detalle;
CREATE TABLE incidencia_detalle (
  inc_codi  INT(11) NOT NULL COMMENT 'Id de la incidencia (app)',
  inc_nro   INT(4)  NOT NULL DEFAULT 1 COMMENT 'Secuencia del detalle',
  inc_desc  TEXT         NULL COMMENT 'Detalle/observacion',
  inc_resp  VARCHAR(6)   NULL COMMENT 'Responsable',
  inc_stat  TINYINT(3)   NULL COMMENT 'Estado del detalle',
  PRIMARY KEY (inc_codi, inc_nro)
) ENGINE=InnoDB;

-- Bitacora de sincronizacion
DROP TABLE IF EXISTS sync_log;
CREATE TABLE sync_log (
  id       BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  proceso  VARCHAR(50)  NULL,
  fecha    DATETIME     NULL,
  filas    INT          NULL,
  resultado VARCHAR(20) NULL,
  detalle  TEXT         NULL
) ENGINE=InnoDB;

-- ============================================================
-- CATALOGOS LOCALES (la BD de la app no depende de las tablas
-- del ERP; se cargan manualmente o via sync)
-- ============================================================

-- Monedas (equivalente mplcom009 del ERP)
DROP TABLE IF EXISTS monedas;
CREATE TABLE monedas (
  com_como   VARCHAR(3)  NOT NULL PRIMARY KEY COMMENT 'Codigo moneda',
  com_sign   VARCHAR(3)  NULL COMMENT 'Simbolo',
  com_des    VARCHAR(50) NULL COMMENT 'Descripcion',
  com_oper   VARCHAR(2)  NULL COMMENT 'Operativo'
) ENGINE=InnoDB;

INSERT INTO monedas (com_como, com_sign, com_des, com_oper) VALUES
  ('PEN', 'S/.', 'NUEVOS SOLES', 'S'),
  ('USD', 'US$', 'DOLARES', 'S'),
  ('U2', 'US$', 'DOLARES (alias U2)', 'S'),
  ('EUR', 'EUR', 'EUROS', 'N');

-- Condiciones de pago (equivalente mplcom010 del ERP)
DROP TABLE IF EXISTS condiciones_pago;
CREATE TABLE condiciones_pago (
  com_cocp   VARCHAR(3)  NOT NULL PRIMARY KEY COMMENT 'Codigo condicion de pago',
  com_dscp   VARCHAR(60) NULL COMMENT 'Descripcion',
  com_ticp   VARCHAR(15) NULL COMMENT 'Tipo (CONTADO/CREDITO/LETRA)'
) ENGINE=InnoDB;

-- Estados de documento (equivalente mplgen006 del ERP)
DROP TABLE IF EXISTS estados_documento;
CREATE TABLE estados_documento (
  gen_stat   VARCHAR(2)  NOT NULL PRIMARY KEY COMMENT 'Codigo estado',
  gen_dsst   VARCHAR(50) NULL COMMENT 'Descripcion estado'
) ENGINE=InnoDB;

INSERT INTO estados_documento (gen_stat, gen_dsst) VALUES
  ('00','OCULTO'),('01','FIRMA DE CONTRATO'),('02','EJECUCION'),
  ('03','LIQUIDACION Y CONFORMIDAD'),('08','PREFACTURA'),('10','EMITIDO'),
  ('11','RENOVADA'),('12','ACEPTADA'),('13','DEVUELTO'),('14','EN CARTERA'),
  ('16','EN COBRANZA'),('17','REFINANCIADO'),('18','EN DESCUENTO'),
  ('19','PROTESTADO'),('20','APROBADO'),('25','BLOQUEADO'),('30','RECHAZADO'),
  ('35','SOLICITUD'),('40','PARCIAL'),('41','PARCIAL ACTIVO'),
  ('60','PAGADO'),('66','PEND. RETENCION'),('74','FACTURADO'),
  ('75','FACTURADO'),('77','APLICADO'),('80','ANULADO'),('86','ELIMINADO'),
  ('90','CERRADO'),('94','DEVUELTO'),('99','INTEGRADO');

-- ============================================================
-- VISTA: documentos pendientes listos para la API/app
-- Incluye nombre de cliente, vendedor, moneda y estado.
-- ============================================================
DROP VIEW IF EXISTS vw_documentos_pendientes;
CREATE VIEW vw_documentos_pendientes AS
SELECT
  d.cob_tivo,
  d.cob_nuvo,
  d.cob_codo,
  d.cob_seri,
  d.cob_nums,
  d.cob_cote,
  c.ter_deno AS cliente_nombre,
  c.ter_core AS vendedor_codigo,
  c.ter_rucn AS cliente_ruc,
  d.cob_feem AS fecha_emision,
  d.cob_feve AS fecha_vencimiento,
  DATEDIFF(CURDATE(), d.cob_feve) AS dias_vencido,
  d.cob_como,
  COALESCE(m.com_sign, '') AS moneda_signo,
  d.cob_stat AS estado_codigo,
  COALESCE(e.gen_dsst, '') AS estado_descripcion,
  d.cob_impo AS importe_original,
  d.pagado,
  d.saldo
FROM cobranza_app.documentos d
LEFT JOIN cobranza_app.clientes c ON c.ter_cote = d.cob_cote
LEFT JOIN cobranza_app.monedas m ON m.com_como = d.cob_como
LEFT JOIN cobranza_app.estados_documento e ON e.gen_stat = d.cob_stat
WHERE d.saldo > 0;
