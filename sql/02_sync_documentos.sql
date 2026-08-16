-- ============================================================
-- 02_sync_documentos.sql
-- Sincroniza DOCUMENTOS PENDIENTES (CxC) del ERP hacia la app.
--
-- CRITERIO DE PENDIENTE (según proceso del usuario):
--   Saldo = Importe del documento (doc_impo) - Suma de pagos aplicados
--   Documento PENDIENTE si Saldo > 0, CANCELADO si Saldo <= 0.
--
-- Requisito: ejecutar con la BD del ERP como base activa.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Calcular pagos aplicados por documento CxC.
--    mficob200 (detalle de cobranza) vincula el pago
--    (cob_tivc/cob_nuvc) con el documento CxC (cob_tivo/cob_nuvo).
--    cob_impc = Importe Cobrado (moneda del documento).
-- ------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_pagos;
CREATE TEMPORARY TABLE tmp_pagos AS
SELECT
  cob_tivo,
  cob_nuvo,
  SUM(cob_impc) AS pagado
FROM mficob200
WHERE cob_stat NOT IN ('80','86','90')   -- excluir pagos anulados/eliminados/cerrados
GROUP BY cob_tivo, cob_nuvo;

-- ------------------------------------------------------------
-- 2) Reconstruir la tabla de documentos con saldo calculado.
--    (Full refresh: se limpia y recarga completa en cada sync)
-- ------------------------------------------------------------
DELETE FROM cobranza_app.documentos;

INSERT INTO cobranza_app.documentos
  (cob_tivo, cob_nuvo, cob_codo, cob_seri, cob_nums, cob_cote,
   cob_feem, cob_feve, cob_como, cob_core, cob_cocp, cob_stat,
   doc_impo, cob_impo, cob_imps, cob_impd, pagado, saldo)
SELECT
  c.cob_tivo,
  c.cob_nuvo,
  c.cob_codo,
  c.cob_seri,
  c.cob_nums,
  c.cob_cote,
  c.cob_feem,
  c.cob_feve,
  c.cob_como,
  c.cob_core,
  c.cob_cocp,
  c.cob_stat,
  c.doc_impo,
  c.cob_impo,
  c.cob_imps,
  c.cob_impd,
  COALESCE(p.pagado, 0)                 AS pagado,
  c.doc_impo - COALESCE(p.pagado, 0)    AS saldo
FROM mficob100 c
LEFT JOIN tmp_pagos p
       ON p.cob_tivo = c.cob_tivo
      AND p.cob_nuvo = c.cob_nuvo
WHERE c.cob_stat NOT IN ('80','86','90')    -- excluir documentos anulados/eliminados/cerrados
  AND c.doc_impo - COALESCE(p.pagado, 0) > 0;  -- SOLO pendientes

-- ------------------------------------------------------------
-- 3) Bitacora
-- ------------------------------------------------------------
INSERT INTO cobranza_app.sync_log (proceso, fecha, filas, resultado)
SELECT 'DOCUMENTOS', NOW(), ROW_COUNT(), 'OK';

-- ============================================================
-- VALIDACION RAPIDA: comparar contra el proceso manual del usuario.
-- Muestra por cliente el importe, lo pagado y el saldo resultante.
-- ============================================================
SELECT
  c.cob_cote AS cliente,
  t.ter_deno AS cliente_nombre,
  c.cob_seri, c.cob_nums,
  c.cob_feem AS emision,
  c.cob_feve AS vencimiento,
  c.cob_impo AS importe_original,
  COALESCE(p.pagado, 0) AS pagado,
  c.cob_impo - COALESCE(p.pagado, 0) AS saldo
FROM mficob100 c
LEFT JOIN mplter001 t ON t.ter_cote = c.cob_cote
LEFT JOIN tmp_pagos p
       ON p.cob_tivo = c.cob_tivo AND p.cob_nuvo = c.cob_nuvo
WHERE c.cob_cote = '000001'   -- <-- cambiar por un cliente de prueba
ORDER BY c.cob_feve;
