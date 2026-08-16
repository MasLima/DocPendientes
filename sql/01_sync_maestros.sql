-- ============================================================
-- 01_sync_maestros.sql
-- Sincroniza VENDEDORES y CLIENTES del ERP hacia la app.
-- Requisito: ejecutar con la BD del ERP como base activa
--            (p.ej. USE <erp_db>;) y la app en la misma instancia.
-- ============================================================

-- ------------------------------------------------------------
-- 1) VENDEDORES: terceros con ter_tite='300000'
--    (los vendedores son empleados registrados en mplter001)
-- ------------------------------------------------------------
REPLACE INTO cobranza_app.vendedores
  (ter_cote, ter_deno, ter_stat, ter_date, ultima_sync)
SELECT
  t.ter_cote,
  t.ter_deno,
  t.ter_stat,
  t.ter_date,
  NOW()
FROM mplter001 t
WHERE t.ter_tite = '300000';

-- Opcional: vincular el usuario ERP (mtguse001) si el codigo
-- de vendedor coincide con el empleado (use_emno).
UPDATE cobranza_app.vendedores v
LEFT JOIN mtguse001 u ON u.use_emno = v.ter_cote
SET v.use_logi = u.use_logi,
    v.use_emno = u.use_emno;

-- ------------------------------------------------------------
-- 2) CLIENTES: terceros con ter_tite='100000'
--    ter_core del cliente = vendedor asignado (ter_cote vendedor)
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
SELECT 'MAESTROS',
       NOW(),
       CONCAT('vend=', (SELECT COUNT(*) FROM cobranza_app.vendedores),
              ' cli=',  (SELECT COUNT(*) FROM cobranza_app.clientes));
