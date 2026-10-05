-- ============================================================
-- 01_sync_maestros.sql
-- Sincroniza VENDEDORES y CLIENTES del ERP hacia la app.
-- VENDEDORES: solo adicion (nunca elimina ni reemplaza).
-- CLIENTES:   adiciona y actualiza existentes.
-- Requisito: ejecutar con la BD del ERP como base activa
--            (p.ej. USE <erp_db>;) y la app en la misma instancia.
-- ============================================================

-- ------------------------------------------------------------
-- 1) VENDEDORES: terceros con ter_tite='300000'
--    (los vendedores son empleados registrados en mplter001)
--    SOLO ADICION: solo inserta los que no existen.
--    NUNCA elimina ni reemplaza registros existentes.
-- ------------------------------------------------------------
INSERT INTO cobranza_app.vendedores
  (ter_cote, ter_deno, use_logi, use_emno, ter_stat, ter_date, ultima_sync)
SELECT
  t.ter_cote,
  t.ter_deno,
  u.use_logi,
  u.use_emno,
  t.ter_stat,
  t.ter_date,
  NOW()
FROM mplter001 t
LEFT JOIN mtguse001 u ON u.use_emno = t.ter_cote
LEFT JOIN cobranza_app.vendedores v ON v.ter_cote = t.ter_cote
WHERE t.ter_tite = '300000'
  AND v.ter_cote IS NULL;

-- ------------------------------------------------------------
-- 2) CLIENTES: terceros con ter_tite='100000'
--    ter_core del cliente = vendedor asignado (ter_cote vendedor)
--    Adiciona y actualiza los existentes; no elimina.
-- ------------------------------------------------------------
REPLACE INTO cobranza_app.clientes
  (ter_cote, ter_deno, ter_dire, ter_rucn, ter_fono, ter_cell,
   ter_emai, ter_core, ter_cocp, ter_licr, ter_stat, ter_cozo, ultima_sync)
SELECT
  t.ter_cote,
  t.ter_deno,
  t.ter_dire,
  t.ter_rucn,
  t.ter_fono,
  t.ter_cell,
  t.ter_emai,
  t.ter_core,
  t.ter_cocp,
  t.ter_licr,
  t.ter_stat,
  t.ter_cozo,
  NOW()
FROM mplter001 t
WHERE t.ter_tite = '100000';

-- ------------------------------------------------------------
-- Bitacora
-- ------------------------------------------------------------
INSERT INTO cobranza_app.sync_log (proceso, fecha, resultado)
SELECT 'VENDEDORES',
       NOW(),
       CONCAT('vend=', (SELECT COUNT(*) FROM cobranza_app.vendedores));

INSERT INTO cobranza_app.sync_log (proceso, fecha, resultado)
SELECT 'CLIENTES',
       NOW(),
       CONCAT('cli=', (SELECT COUNT(*) FROM cobranza_app.clientes));
