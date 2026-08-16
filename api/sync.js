require('dotenv').config();
const erp = require('./src/config/erp');
const app = require('./src/config/db');

// Estados del ERP que cuentan como cobro/pago VALIDO (mficob200.cob_stat).
//   90 CERRADO  10 EMITIDO  18 EN DESCUENTO   (80 ANULADO no cuenta)
const ESTADOS_PAGO_VALIDOS = ['10', '18', '90'];

// Estados del documento (mficob100.cob_stat) que NO son pendientes
// (anulados / eliminados / cerrados). El resto se considera pendiente
// mientras tenga saldo > 0.
const ESTADOS_DOC_EXCLUIDOS = ['80', '86', '90'];

// Mapeo de codigos de moneda ERP -> codigos de la app
const MONEDAS = { PEN: 'PEN', USD: 'USD', U2: 'USD', D2: 'USD', EUR: 'EUR' };

async function logSync(app, proceso, filas, detalle = null) {
  await app.query(
    `INSERT INTO sync_log (proceso, fecha, filas, resultado, detalle)
     VALUES (?, NOW(), ?, 'OK', ?)`,
    [proceso, filas, detalle]
  );
}

async function syncMaestros() {
  console.log('=== SYNC MAESTROS ===');

  // ---------- VENDEDORES ----------
  console.log('Leyendo vendedores del ERP (mplter001 ter_tite=300000)...');
  const [vendedores] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_stat, t.ter_date,
            u.use_logi
     FROM mplter001 t
     LEFT JOIN mtguse001 u ON u.use_emno = t.ter_cote
     WHERE t.ter_tite = '300000'`
  );
  console.log(`  Vendedores en ERP: ${vendedores.length}`);

  for (const v of vendedores) {
    await app.query(
      `REPLACE INTO vendedores (ter_cote, ter_deno, use_logi, ter_stat, ter_date, ultima_sync)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [v.ter_cote, v.ter_deno, v.use_logi || null, v.ter_stat, v.ter_date]
    );
  }
  console.log(`  Vendedores insertados: ${vendedores.length}`);

  // ---------- CLIENTES ----------
  console.log('Leyendo clientes del ERP (mplter001 ter_tite=100000)...');
  const [clientes] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_dire, t.ter_rucn, t.ter_fono,
            t.ter_cell, t.ter_emai, t.ter_core, t.ter_cocp, t.ter_licr,
            t.ter_stat, t.ter_cozo
     FROM mplter001 t
     WHERE t.ter_tite = '100000'`
  );
  console.log(`  Clientes en ERP: ${clientes.length}`);

  for (const c of clientes) {
    await app.query(
      `REPLACE INTO clientes
         (ter_cote, ter_deno, ter_dire, ter_rucn, ter_fono, ter_cell,
          ter_emai, ter_core, ter_cocp, ter_licr, ter_stat, ter_cozo, ultima_sync)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [c.ter_cote, c.ter_deno, c.ter_dire, c.ter_rucn, c.ter_fono,
       c.ter_cell, c.ter_emai, c.ter_core, c.ter_cocp, c.ter_licr,
       c.ter_stat, c.ter_cozo]
    );
  }
  console.log(`  Clientes insertados: ${clientes.length}`);

  await logSync(app, 'MAESTROS', vendedores.length + clientes.length,
    `vend=${vendedores.length} cli=${clientes.length}`);

  return { vendedores: vendedores.length, clientes: clientes.length };
}

async function syncDocumentos() {
  console.log('=== SYNC DOCUMENTOS PENDIENTES ===');

  const placeholders = ESTADOS_PAGO_VALIDOS.map(() => '?').join(',');
  const excl = ESTADOS_DOC_EXCLUIDOS.map(() => '?').join(',');

  console.log('Leyendo documentos con saldo (mficob100 - pagos mficob200)...');
  const [docs] = await erp.query(
    `SELECT
       d.cob_tivo,
       d.cob_nuvo,
       d.cob_codo,
       d.cob_seri,
       d.cob_nums,
       d.cob_cote,
       d.cob_feem,
       d.cob_feve,
       d.cob_como,
       d.cob_core,
       d.cob_cocp,
       d.cob_stat,
       d.doc_impo,
       d.cob_impo,
       d.cob_imps,
       d.cob_impd,
       COALESCE(SUM(p.cob_impc), 0) AS pagado
     FROM mficob100 d
     LEFT JOIN mficob200 p
       ON p.cob_tivo = d.cob_tivo
      AND p.cob_nuvo = d.cob_nuvo
      AND p.cob_stat IN (${placeholders})
     WHERE d.cob_stat NOT IN (${excl})
     GROUP BY d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
              d.cob_cote, d.cob_feem, d.cob_feve, d.cob_como, d.cob_core,
              d.cob_cocp, d.cob_stat, d.doc_impo, d.cob_impo, d.cob_imps, d.cob_impd
     HAVING (d.cob_impo - COALESCE(SUM(p.cob_impc), 0)) > 0.01`,
    [...ESTADOS_PAGO_VALIDOS, ...ESTADOS_DOC_EXCLUIDOS]
  );
  console.log(`  Documentos pendientes en ERP: ${docs.length}`);

  console.log('Limpieza previa de tabla documentos...');
  await app.query('DELETE FROM documentos');
  await app.query('ALTER TABLE documentos AUTO_INCREMENT = 1');

  let insertados = 0;
  for (const d of docs) {
    const monedaApp = MONEDAS[d.cob_como] || d.cob_como;
    const pagado = Number(d.pagado) || 0;
    const saldo = (Number(d.cob_impo) || 0) - pagado;
    if (saldo <= 0.01) continue;

    await app.query(
      `INSERT INTO documentos
         (cob_tivo, cob_nuvo, cob_codo, cob_seri, cob_nums, cob_cote,
          cob_feem, cob_feve, cob_como, cob_core, cob_cocp, cob_stat,
          doc_impo, cob_impo, cob_imps, cob_impd, pagado, saldo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
       d.cob_cote, d.cob_feem, d.cob_feve, monedaApp, d.cob_core,
       d.cob_cocp, d.cob_stat, d.doc_impo, d.cob_impo, d.cob_imps,
       d.cob_impd, pagado, Number(saldo.toFixed(2))]
    );
    insertados++;
  }
  console.log(`  Documentos pendientes cargados: ${insertados}`);

  await logSync(app, 'DOCUMENTOS', insertados);

  return { documentos: insertados };
}

async function main() {
  try {
    const m = await syncMaestros();
    const d = await syncDocumentos();
    console.log('====================');
    console.log('SYNC COMPLETADO OK');
    console.log(`  Vendedores: ${m.vendedores}`);
    console.log(`  Clientes:   ${m.clientes}`);
    console.log(`  Pendientes: ${d.documentos}`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR en sync:', err);
    process.exit(1);
  }
}

main();
