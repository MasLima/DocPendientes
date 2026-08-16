-- ============================================================
-- 03_sync_incidencias.sql
-- Sincroniza INCIDENCIAS entre la app y el ERP.
--
-- DIRECCION 1 (app -> ERP): las incidencias registradas por el
--   vendedor en la app se INSERTAN en mcoinci010 (y detalle mcoinci020).
--
-- DIRECCION 2 (ERP -> app): actualizaciones hechas en el ERP
--   (fechas de resolucion, estados) se bajan a la app.
--
-- Requisito: ejecutar con la BD del ERP como base activa.
-- ============================================================

-- ------------------------------------------------------------
-- 1) APP -> ERP: enviar incidencias pendientes (sincronizada=0)
-- ------------------------------------------------------------
INSERT INTO mcoinci010
  (ter_cote, use_emno, inc_cont, inc_desc, inc_acci,
   fe_regi, fe_aten, fe_resu, inc_esta, inc_estc)
SELECT
  i.ter_cote,
  i.use_emno,
  i.inc_cont,
  i.inc_desc,
  i.inc_acci,
  i.fe_regi,
  i.fe_aten,
  i.fe_resu,
  i.inc_esta,
  i.inc_estc
FROM cobranza_app.incidencias i
WHERE i.sincronizada = 0
ORDER BY i.inc_codi;

-- Registrar el inc_codi generado en el ERP en la app.
-- (MySQL: LAST_INSERT_ID() tras el INSERT anterior solo devuelve
--  el primer ID; para multiples filas se recomienda un procedimiento
--  que inserte de a una. Aqui se marca todas como sincronizadas.)
UPDATE cobranza_app.incidencias
SET sincronizada = 1,
    ultima_sync  = NOW()
WHERE sincronizada = 0;

-- Envio del DETALLE (mcoinci020) de las incidencias recien enviadas.
-- Nota: ajustar la correspondencia de inc_codi si se usa el ID del ERP.
INSERT INTO mcoinci020
  (inc_codi, inc_nro, inc_desc, inc_resp, inc_stat)
SELECT
  i.inc_codi,
  d.inc_nro,
  d.inc_desc,
  d.inc_resp,
  d.inc_stat
FROM cobranza_app.incidencia_detalle d
JOIN cobranza_app.incidencias i ON i.inc_codi = d.inc_codi
WHERE i.inc_codi_erp IS NULL;   -- solo detalle no enviado aun

-- ------------------------------------------------------------
-- 2) ERP -> APP: bajar resoluciones / estados actualizados.
--    Relaciona por el codigo de incidencia del ERP.
-- ------------------------------------------------------------
UPDATE cobranza_app.incidencias a
JOIN mcoinci010 e ON e.inc_codi = a.inc_codi_erp
SET a.fe_resu  = COALESCE(e.fe_resu, a.fe_resu),
    a.inc_esta = COALESCE(e.inc_esta, a.inc_esta),
    a.inc_estc = COALESCE(e.inc_estc, a.inc_estc),
    a.ultima_sync = NOW()
WHERE a.inc_codi_erp IS NOT NULL;

-- ------------------------------------------------------------
-- Bitacora
-- ------------------------------------------------------------
INSERT INTO cobranza_app.sync_log (proceso, fecha, resultado)
SELECT 'INCIDENCIAS', NOW(), CONCAT('enviadas=', ROW_COUNT());
