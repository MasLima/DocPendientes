const erp = require('../config/erp');
const app = require('../config/db');

// Limpia caracteres Unicode problematicos
function limpiarUnicode(s) {
  if (!s || typeof s !== 'string') return s;
  return s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD]/g, '').trim();
}

// Verifica si la tabla articulos tiene las columnas de unidades
let _tieneColumnasUnidades = null;
async function tieneColumnasUnidades() {
  if (_tieneColumnasUnidades !== null) return _tieneColumnasUnidades;
  try {
    const [cols] = await app.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'articulos'
       AND COLUMN_NAME IN ('uventa_desc','ucompra_desc','ustock_desc','uventa_abrev','ucompra_abrev','ustock_abrev')`
    );
    _tieneColumnasUnidades = cols.length === 6;
  } catch { _tieneColumnasUnidades = false; }
  return _tieneColumnasUnidades;
}

// Estados del ERP que cuentan como cobro/pago VALIDO (mficob200.cob_stat).
const ESTADOS_PAGO_VALIDOS = ['10', '18', '90'];

// Estados del documento (mficob100.cob_stat) que NO son pendientes
const ESTADOS_DOC_EXCLUIDOS = ['80', '86', '90'];

// Mapeo de codigos de moneda ERP -> codigos de la app
const MONEDAS = { PEN: 'PEN', USD: 'USD', U2: 'USD', D2: 'USD', EUR: 'EUR' };

async function logSync(proceso, filas, resultado = 'OK', detalle = null) {
  await app.query(
    `INSERT INTO sync_log (proceso, fecha, filas, resultado, detalle)
     VALUES (?, NOW(), ?, ?, ?)`,
    [proceso, filas, resultado, detalle]
  );
}

// ==================== MAESTROS: VENDEDORES Y CLIENTES ====================
// VENDEDORES: solo adicion (nunca elimina ni reemplaza).
// CLIENTES: modo parcial REPLACE INTO (actualiza, no elimina) / completo DELETE + INSERT.

// ==================== VENDEDORES (SOLO ADICION) ====================
// Solo inserta los vendedores que aun no existen en la tabla.
// NUNCA elimina ni reemplaza registros existentes (ignora modo completo).

async function syncVendedores() {
  const [vendedores] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_stat, t.ter_date, u.use_logi
     FROM mplter001 t LEFT JOIN mtguse001 u ON u.use_emno = t.ter_cote
     WHERE t.ter_tite = '300000'`
  );
  const [existentes] = await app.query('SELECT ter_cote FROM vendedores');
  const set = new Set(existentes.map((v) => v.ter_cote));

  let insertados = 0, yaExistentes = 0, errores = 0;
  for (const v of vendedores) {
    if (set.has(v.ter_cote)) { yaExistentes++; continue; }
    try {
      await app.query(
        `INSERT INTO vendedores (ter_cote, ter_deno, use_logi, ter_stat, ter_date, ultima_sync)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [v.ter_cote, limpiarUnicode(v.ter_deno), v.use_logi || null, v.ter_stat, v.ter_date]
      );
      insertados++;
    } catch (e) { errores++; console.error(`Sync vendedor ${v.ter_cote} error:`, e.message); }
  }

  await logSync('VENDEDORES', insertados,
    errores > 0 ? 'PARCIAL' : 'OK',
    `nuevos=${insertados} existentes=${yaExistentes}${errores > 0 ? ` err=${errores}` : ''}`);
  return { vendedores: insertados, nuevos: insertados, existentes: yaExistentes, errores };
}

// ==================== CLIENTES ====================
// Parcial: REPLACE INTO (adiciona y actualiza, no elimina).
// Completo: DELETE + INSERT.

const SQL_CLIENTES = `INSERT INTO clientes
   (ter_cote, ter_deno, ter_dire, ter_rucn, ter_fono, ter_cell,
    ter_emai, ter_core, ter_cocp, ter_licr, ter_stat, ter_cozo, ultima_sync)
 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`;

function paramsClientes(c) {
  return [c.ter_cote, limpiarUnicode(c.ter_deno), limpiarUnicode(c.ter_dire),
    c.ter_rucn, c.ter_fono, c.ter_cell, limpiarUnicode(c.ter_emai),
    c.ter_core, c.ter_cocp, c.ter_licr, c.ter_stat, c.ter_cozo];
}

async function _syncClientes(modo) {
  const [clientes] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_dire, t.ter_rucn, t.ter_fono,
            t.ter_cell, t.ter_emai, t.ter_core, t.ter_cocp, t.ter_licr,
            t.ter_stat, t.ter_cozo
     FROM mplter001 t WHERE t.ter_tite = '100000'`
  );
  if (modo === 'completo') await app.query('DELETE FROM clientes');

  let insertados = 0, errores = 0;
  for (const c of clientes) {
    try {
      if (modo === 'completo') {
        await app.query(SQL_CLIENTES, paramsClientes(c));
      } else {
        await app.query(
          `REPLACE INTO clientes
             (ter_cote, ter_deno, ter_dire, ter_rucn, ter_fono, ter_cell,
              ter_emai, ter_core, ter_cocp, ter_licr, ter_stat, ter_cozo, ultima_sync)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          paramsClientes(c)
        );
      }
      insertados++;
    } catch (e) { errores++; console.error(`Sync cliente ${c.ter_cote} error:`, e.message); }
  }

  await logSync('CLIENTES', insertados,
    errores > 0 ? 'PARCIAL' : 'OK',
    `procesados=${insertados}/${clientes.length}${errores > 0 ? ` err=${errores}` : ''}`);
  return { clientes: insertados, errores };
}

async function syncClientesParcial() {
  return _syncClientes('parcial');
}

async function syncCondicionesPagoParcial() {
  const [conds] = await erp.query(`SELECT com_cocp, com_dscp, com_ticp FROM mplcom010`);
  for (const c of conds) {
    await app.query(
      `REPLACE INTO condiciones_pago (com_cocp, com_dscp, com_ticp) VALUES (?, ?, ?)`,
      [c.com_cocp, limpiarUnicode(c.com_dscp), c.com_ticp]
    );
  }
  await logSync('CONDICIONES_PAGO', conds.length, 'OK', `cond=${conds.length}`);
  return { condiciones: conds.length };
}

async function syncTiposDocumentoParcial() {
  const [tipos] = await erp.query(
    `SELECT gen_codo, gen_dsdo FROM mplgen003 WHERE gen_subd = 0 GROUP BY gen_codo, gen_dsdo`
  );
  for (const t of tipos) {
    await app.query(
      `REPLACE INTO tipos_documento (cob_codo, doc_descripcion) VALUES (?, ?)`,
      [t.gen_codo, limpiarUnicode(t.gen_dsdo)]
    );
  }
  await app.query(
    `REPLACE INTO tipos_documento (cob_codo, doc_descripcion) VALUES ('71', 'Letra')`
  );
  await logSync('TIPOS_DOCUMENTO', tipos.length + 1, 'OK', `tipos=${tipos.length}`);
  return { tipos: tipos.length };
}

async function syncBancosParcial() {
  const [bancos] = await erp.query(`SELECT ban_codi, ban_desc FROM mplcob002`);
  for (const b of bancos) {
    await app.query(
      `REPLACE INTO bancos (ban_codi, ban_desc) VALUES (?, ?)`,
      [b.ban_codi, b.ban_desc]
    );
  }
  await logSync('BANCOS', bancos.length, 'OK', `bancos=${bancos.length}`);
  return { bancos: bancos.length };
}

// ==================== ARTICULOS ====================

async function _syncArticulosBase(modo) {
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;
  const conUnidades = await tieneColumnasUnidades();

  const [items] = await erp.query(
    `SELECT i.ite_item, i.ite_dsit, i.ite_dste, i.ite_uven,
            i.ite_ucom, i.ite_usto, i.ite_imag, i.ite_coar, i.ite_coli,
            i.ite_cofa, i.ite_esta, i.ite_pruv, i.ite_feuv, i.ite_copr, i.ite_codl,
            i.ite_stog, i.ite_coin
     FROM mplite001 i
     WHERE i.ite_esta NOT IN (
       SELECT e.ite_esta FROM mplite011 e
       WHERE UPPER(e.ite_dses) LIKE '%BAJA%'
     )`
  );
  const totalErp = items.length;
  console.log(`[syncArt] items del ERP (sin BAJA): ${totalErp}`);

  const [unidades] = await erp.query(`SELECT ite_coum, ite_abum, ite_dsum FROM mplite005`);
  const unidadesMap = new Map(unidades.map(u => [u.ite_coum, { abrev: u.ite_abum, desc: limpiarUnicode(u.ite_dsum) }]));
  console.log(`[syncArt] unidades: ${unidades.length}`);

  const [lineas] = await erp.query(`SELECT ite_coli, ite_dsli FROM mplite003`);
  const lineasMap = new Map(lineas.map(l => [l.ite_coli, limpiarUnicode(l.ite_dsli)]));

  const [familias] = await erp.query(`SELECT ite_cofa, ite_dsfa FROM mplite014`);
  const familiasMap = new Map(familias.map(f => [f.ite_cofa, limpiarUnicode(f.ite_dsfa)]));

  const [estados] = await erp.query(`SELECT ite_esta, ite_dses FROM mplite011`);
  const estadosMap = new Map(estados.map(e => [e.ite_esta, limpiarUnicode(e.ite_dses)]));

  const [saldos] = await erp.query(
    `SELECT sto_item, SUM(sto_cant) AS saldo FROM mlosto050
     WHERE sto_year = ? AND sto_peri <= ? GROUP BY sto_item`,
    [anioActual, mesActual]
  );
  const saldosMap = new Map(saldos.map(s => [s.sto_item, Number(s.saldo) || 0]));

  if (modo === 'completo') await app.query('DELETE FROM articulos');

  const sqlCon = `REPLACE INTO articulos
    (ite_item, ite_codi, ite_dsit, ite_dste, ite_uven, ite_ucom,
     ite_usto, ite_imag, ite_coar, ite_coli, ite_cofa, ite_esta,
     ite_pruv, ite_feuv, ite_copr, ite_codl,
     saldo, linea_desc, familia_desc, unidad_desc, estado_desc,
     ultima_sync,
     uventa_desc, ucompra_desc, ustock_desc,
     uventa_abrev, ucompra_abrev, ustock_abrev)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?)`;

  const sqlSin = `REPLACE INTO articulos
    (ite_item, ite_codi, ite_dsit, ite_dste, ite_uven, ite_ucom,
     ite_usto, ite_imag, ite_coar, ite_coli, ite_cofa, ite_esta,
     ite_pruv, ite_feuv, ite_copr, ite_codl,
     saldo, linea_desc, familia_desc, unidad_desc, estado_desc,
     ultima_sync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, NOW())`;

  let insertados = 0, errores = 0, primerError = null;
  for (const item of items) {
    try {
      const saldo = saldosMap.get(item.ite_item) || Number(item.ite_stog) || 0;
      const dste = item.ite_dste ? String(item.ite_dste) : null;
      const uv = unidadesMap.get(item.ite_uven) || {};
      const uc = unidadesMap.get(item.ite_ucom) || {};
      const us = unidadesMap.get(item.ite_usto) || {};
      const base = [
        item.ite_item, item.ite_coin || null, limpiarUnicode(item.ite_dsit), dste,
        item.ite_uven, item.ite_ucom, item.ite_usto,
        item.ite_imag, item.ite_coar, item.ite_coli, item.ite_cofa, item.ite_esta,
        item.ite_pruv, item.ite_feuv, item.ite_copr, item.ite_codl,
        saldo,
        lineasMap.get(item.ite_coli) || null, familiasMap.get(item.ite_cofa) || null,
        us.desc || null, estadosMap.get(item.ite_esta) || null
      ];
      if (conUnidades) {
        await app.query(sqlCon, [...base,
          uv.desc || null, uc.desc || null, us.desc || null,
          uv.abrev || null, uc.abrev || null, us.abrev || null]);
      } else {
        await app.query(sqlSin, base);
      }
      insertados++;
    } catch (e) {
      errores++;
      if (!primerError) primerError = { item: item.ite_item, msg: e.message, code: e.code };
      if (errores <= 5) console.error(`[syncArt] ${item.ite_item}:`, e.code, '-', e.message);
    }
  }
  console.log(`[syncArt ${modo}] conUnidades=${conUnidades} items=${items.length} ins=${insertados} err=${errores}`);
  if (primerError) console.log('[syncArt] primer error:', JSON.stringify(primerError));

  await logSync('ARTICULOS', insertados, errores > 0 ? (modo === 'completo' ? 'COMPLETO' : 'PARCIAL') : 'OK',
    `insertados=${insertados}${errores > 0 ? ` err=${errores}` : ''}`);
  return { articulos: insertados, errores };
}

async function syncArticulosParcial() {
  return _syncArticulosBase('parcial');
}

async function syncArticulosCompleto() {
  return _syncArticulosBase('completo');
}

// ==================== COMPRAS ====================

async function syncComprasParcial() {
  const [items] = await erp.query(
    `SELECT c.sto_item,
            CAST(c.sto_fere AS CHAR) AS fecha_compra,
            CAST(c.sto_cous AS DECIMAL(18,8)) AS importe_compra
     FROM mlosto040 c
     INNER JOIN (
       SELECT a.sto_item, MAX(a.sto_fere) AS max_fere
       FROM mlosto040 a
       WHERE a.sto_stat IN ('90','99') AND a.sto_timo IN ('100','207')
       GROUP BY a.sto_item
     ) latest ON c.sto_item = latest.sto_item AND c.sto_fere = latest.max_fere
     WHERE c.sto_stat IN ('90','99') AND c.sto_timo IN ('100','207')`
  );
  console.log(`[syncCompras] compras del ERP: ${items.length}`);
  if (items.length > 0) {
    console.log(`[syncCompras] MUESTRA (5 primeros):`);
    items.slice(0, 5).forEach(c => {
      console.log(`  item=${c.sto_item} fecha=${JSON.stringify(c.fecha_compra)} importe=${JSON.stringify(c.importe_compra)} tipo=${typeof c.importe_compra}`);
    });
  }

  let actualizados = 0, errores = 0, primerError = null;
  for (const row of items) {
    try {
      await app.query(
        `UPDATE articulos SET fecha_compra = ?, importe_compra = ? WHERE ite_item = ?`,
        [row.fecha_compra, Number(row.importe_compra) || 0, row.sto_item]
      );
      actualizados++;
    } catch (e) {
      errores++;
      if (!primerError) primerError = { item: row.sto_item, msg: e.message, code: e.code };
      if (errores <= 5) console.error(`[syncCompras] ${row.sto_item}:`, e.code, '-', e.message);
    }
  }

  const [verif] = await app.query(
    `SELECT ite_item, fecha_compra, importe_compra FROM articulos
     WHERE fecha_compra IS NOT NULL OR importe_compra IS NOT NULL
     ORDER BY ite_item LIMIT 5`
  );
  if (verif.length > 0) {
    console.log('[syncCompras] VERIFICACION post-sync:');
    verif.forEach(v => {
      console.log(`  ${v.ite_item}: fecha=${JSON.stringify(v.fecha_compra)} importe=${JSON.stringify(v.importe_compra)}`);
    });
  }

  console.log(`[syncCompras] items=${items.length} upd=${actualizados} err=${errores}`);
  if (primerError) console.log('[syncCompras] primer error:', JSON.stringify(primerError));
  await logSync('COMPRAS', actualizados, errores > 0 ? 'PARCIAL' : 'OK',
    `actualizados=${actualizados}${errores > 0 ? ` err=${errores}` : ''}`);
  return { compras: actualizados, errores };
}

// ==================== PRECIOS ====================

async function syncPrecios() {
  try {
    const [articulosExistentes] = await app.query('SELECT ite_item FROM articulos');
    const itemsLocales = articulosExistentes.map(a => a.ite_item);
    if (itemsLocales.length === 0) {
      console.log('[syncPrecios] No hay artículos sincronizados, saltando');
      await logSync('PRECIOS', 0, 'OK', 'sin articulos locales');
      return { precios: 0 };
    }

    const placeholders = itemsLocales.map(() => '?').join(',');
    const [precios] = await erp.query(
      `SELECT ven_item, ven_cota, ven_pigv
       FROM mplven010
       WHERE ven_item IN (${placeholders}) AND ven_cota IN ('101', '102', '106')`,
      itemsLocales
    );
    console.log(`[syncPrecios] precios del ERP: ${precios.length} (de ${itemsLocales.length} artículos locales)`);
    await app.query('DELETE FROM articulos_precios');
    let insertados = 0;
    for (const p of precios) {
      try {
        await app.query(
          `INSERT INTO articulos_precios (ven_item, ven_cota, ven_pric, ven_pigv)
           VALUES (?, ?, ?, ?)`,
          [p.ven_item, p.ven_cota, 0, Number(Number(p.ven_pigv).toFixed(4))]
        );
        insertados++;
      } catch (e) {
        console.error(`[syncPrecios] ${p.ven_item}-${p.ven_cota}:`, e.message);
      }
    }
    console.log(`[syncPrecios] insertados: ${insertados}`);
    await logSync('PRECIOS', insertados, 'OK', `precios=${insertados}`);
    return { precios: insertados };
  } catch (err) {
    console.error('[syncPrecios] Error:', err.message);
    await logSync('PRECIOS', 0, 'ERROR', err.message);
    return { precios: 0, error: err.message };
  }
}

// ==================== CLIENTES COMPLETO ====================

async function syncClientesCompleto() {
  return _syncClientes('completo');
}

async function syncCondicionesPagoCompleto() {
  const [conds] = await erp.query(`SELECT com_cocp, com_dscp, com_ticp FROM mplcom010`);
  await app.query('DELETE FROM condiciones_pago');
  for (const c of conds) {
    await app.query(
      `INSERT INTO condiciones_pago (com_cocp, com_dscp, com_ticp) VALUES (?, ?, ?)`,
      [c.com_cocp, limpiarUnicode(c.com_dscp), c.com_ticp]
    );
  }
  await logSync('CONDICIONES_PAGO', conds.length, 'OK', `cond=${conds.length}`);
  return { condiciones: conds.length };
}

async function syncTiposDocumentoCompleto() {
  const [tipos] = await erp.query(
    `SELECT gen_codo, gen_dsdo FROM mplgen003 WHERE gen_subd = 0 GROUP BY gen_codo, gen_dsdo`
  );
  await app.query('DELETE FROM tipos_documento');
  for (const t of tipos) {
    await app.query(
      `INSERT INTO tipos_documento (cob_codo, doc_descripcion) VALUES (?, ?)`,
      [t.gen_codo, limpiarUnicode(t.gen_dsdo)]
    );
  }
  await app.query(
    `INSERT INTO tipos_documento (cob_codo, doc_descripcion) VALUES ('71', 'Letra')`
  );
  await logSync('TIPOS_DOCUMENTO', tipos.length + 1, 'OK', `tipos=${tipos.length}`);
  return { tipos: tipos.length };
}

async function syncBancosCompleto() {
  const [bancos] = await erp.query(`SELECT ban_codi, ban_desc FROM mplcob002`);
  await app.query('DELETE FROM bancos');
  for (const b of bancos) {
    await app.query(
      `INSERT INTO bancos (ban_codi, ban_desc) VALUES (?, ?)`,
      [b.ban_codi, b.ban_desc]
    );
  }
  await logSync('BANCOS', bancos.length, 'OK', `bancos=${bancos.length}`);
  return { bancos: bancos.length };
}

// ==================== DOCUMENTOS (siempre completo) ====================

async function syncDocumentos() {
  const placeholders = ESTADOS_PAGO_VALIDOS.map(() => '?').join(',');
  const excl = ESTADOS_DOC_EXCLUIDOS.map(() => '?').join(',');

  const [docs] = await erp.query(
    `SELECT d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
            d.cob_cote, d.cob_feem, d.cob_feve, d.cob_como, d.cob_core,
            d.cob_cocp, d.cob_stat, d.cob_banc, d.cob_nuni,
            d.doc_impo, d.cob_impo, d.cob_imps, d.cob_impd,
            COALESCE(SUM(p.cob_impc), 0) AS pagado
     FROM mficob100 d
     LEFT JOIN mficob200 p
       ON p.cob_tivo = d.cob_tivo AND p.cob_nuvo = d.cob_nuvo AND p.cob_stat IN (${placeholders})
     WHERE d.cob_stat NOT IN (${excl})
     GROUP BY d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
              d.cob_cote, d.cob_feem, d.cob_feve, d.cob_como, d.cob_core,
              d.cob_cocp, d.cob_stat, d.cob_banc, d.cob_nuni,
              d.doc_impo, d.cob_impo, d.cob_imps, d.cob_impd
     HAVING (d.cob_impo - COALESCE(SUM(p.cob_impc), 0)) > 0.01`,
    [...ESTADOS_PAGO_VALIDOS, ...ESTADOS_DOC_EXCLUIDOS]
  );

  await app.query('DELETE FROM documentos');
  await app.query('ALTER TABLE documentos AUTO_INCREMENT = 1');

  let insertados = 0, errores = 0;
  for (const d of docs) {
    try {
      const monedaApp = MONEDAS[d.cob_como] || d.cob_como;
      const pagado = Number(d.pagado) || 0;
      const saldo = (Number(d.cob_impo) || 0) - pagado;
      if (saldo <= 0.01) continue;
      await app.query(
        `INSERT INTO documentos
           (cob_tivo, cob_nuvo, cob_codo, cob_seri, cob_nums, cob_cote,
            cob_feem, cob_feve, cob_como, cob_core, cob_cocp, cob_stat,
            cob_banc, cob_nuni, doc_impo, cob_impo, cob_imps, cob_impd, pagado, saldo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
         d.cob_cote, d.cob_feem, d.cob_feve, monedaApp, d.cob_core,
         d.cob_cocp, d.cob_stat, d.cob_banc, d.cob_nuni,
         d.doc_impo, d.cob_impo, d.cob_imps, d.cob_impd, pagado, Number(saldo.toFixed(2))]
      );
      insertados++;
    } catch (e) { errores++; console.error(`Sync doc ${d.cob_codo}-${d.cob_seri}-${d.cob_nums} error:`, e.message); }
  }
  await logSync('DOCUMENTOS', insertados, errores > 0 ? 'PARCIAL' : 'OK',
    `insertados=${insertados}${errores > 0 ? ` err=${errores}` : ''}`);
  return { documentos: insertados };
}

// ==================== INCIDENCIAS (siempre incremental) ====================

async function syncIncidencias() {
  const [inc] = await erp.query(
    `SELECT inc_codi, ter_cote, use_emno, inc_cont, inc_desc,
            fe_regi, fe_aten, fe_resu, inc_esta, inc_estc
     FROM mcoinci010`
  );
  const [det] = await erp.query(
    `SELECT inc_codi, inc_nro, inc_desc, inc_resp, inc_stat FROM mcoinci020`
  );
  const detByInc = new Map();
  for (const d of det) {
    if (!detByInc.has(d.inc_codi)) detByInc.set(d.inc_codi, []);
    detByInc.get(d.inc_codi).push(d);
  }

  let insertados = 0, actualizados = 0, errores = 0;
  for (const r of inc) {
    try {
      const exist = await app.query('SELECT inc_codi FROM incidencias WHERE inc_codi_erp = ?', [r.inc_codi]);
      if (exist[0].length > 0) {
        await app.query(
          `UPDATE incidencias SET ter_cote=?, use_emno=?, inc_cont=?, inc_desc=?,
              fe_regi=?, fe_aten=?, fe_resu=?, inc_esta=?, inc_estc=?, sincronizada=1, ultima_sync=NOW()
           WHERE inc_codi_erp=?`,
          [r.ter_cote, r.use_emno, limpiarUnicode(r.inc_cont), limpiarUnicode(r.inc_desc),
           r.fe_regi, r.fe_aten, r.fe_resu, r.inc_esta, r.inc_estc, r.inc_codi]
        );
        actualizados++;
      } else {
        const [res] = await app.query(
          `INSERT INTO incidencias
             (inc_codi_erp, ter_cote, use_emno, inc_cont, inc_desc,
              fe_regi, fe_aten, fe_resu, inc_esta, inc_estc, sincronizada, ultima_sync)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
          [r.inc_codi, r.ter_cote, r.use_emno, limpiarUnicode(r.inc_cont), limpiarUnicode(r.inc_desc),
           r.fe_regi, r.fe_aten, r.fe_resu, r.inc_esta, r.inc_estc]
        );
        insertados++;
        const detalles = detByInc.get(r.inc_codi) || [];
        for (const dd of detalles) {
          try {
            await app.query(
              `INSERT INTO incidencia_detalle (inc_codi, inc_nro, inc_desc, inc_resp, inc_stat) VALUES (?, ?, ?, ?, ?)`,
              [res.insertId, dd.inc_nro, limpiarUnicode(dd.inc_desc), dd.inc_resp, dd.inc_stat]
            );
          } catch (e) { console.error(`Sync detalle incidencia ${r.inc_codi} nro ${dd.inc_nro} error:`, e.message); }
        }
      }
    } catch (e) { errores++; console.error(`Sync incidencia ${r.inc_codi} error:`, e.message); }
  }
  await logSync('INCIDENCIAS', insertados + actualizados, errores > 0 ? 'PARCIAL' : 'OK',
    `nuevas=${insertados} actualizadas=${actualizados}${errores > 0 ? ` err=${errores}` : ''}`);
  return { incidencias: insertados, actualizadas: actualizados };
}

// ==================== USUARIOS (SOLO ADICION) ====================
// Solo inserta usuarios que aun no existen en usuarios_app.
// NUNCA actualiza, reemplaza ni desactiva registros existentes.

const AREAS_PERFILES = {
  '100001': 'gerencia', '100002': 'empleado', '100003': 'contabilidad',
  '100004': 'vendedor', '100008': 'sistemas'
};

async function syncUsuarios() {
  const areas = Object.keys(AREAS_PERFILES).map(() => '?').join(',');
  const [usuarios] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_area, t.ter_stat,
            u.use_logi, u.use_name, u.use_apel, u.use_pass, u.use_tipo
     FROM mplter001 t LEFT JOIN mtguse001 u ON u.use_emno = t.ter_cote
     WHERE t.ter_tite = '300000' AND t.ter_stat = '10' AND t.ter_area IN (${areas})`,
    Object.keys(AREAS_PERFILES)
  );

  let creados = 0, existentes = 0, errores = 0;

  for (const u of usuarios) {
    if (!u.use_logi || !u.use_pass) continue;
    const rol = AREAS_PERFILES[u.ter_area];
    if (!rol) continue;

    try {
      const [exist] = await app.query(`SELECT id FROM usuarios_app WHERE use_logi = ?`, [u.use_logi]);
      if (exist.length > 0) { existentes++; continue; }

      const nombre = limpiarUnicode(u.use_name) || '';
      const apellido = limpiarUnicode(u.use_apel) || '';

      await app.query(
        `INSERT INTO usuarios_app (ter_cote, use_logi, use_pass, use_name, use_apel, rol, activo, origen)
         VALUES (?, ?, ?, ?, ?, ?, 1, 'ERP')`,
        [u.ter_cote, u.use_logi, u.use_pass, nombre, apellido, rol]
      );
      creados++;
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') { existentes++; continue; }
      errores++;
      console.error(`Sync usuario ${u.use_logi} error:`, e.message);
    }
  }

  await logSync('USUARIOS', creados,
    errores > 0 ? 'PARCIAL' : 'OK',
    `nuevos=${creados} existentes=${existentes}${errores > 0 ? ` err=${errores}` : ''}`);
  return { usuarios: creados, creados, existentes, errores };
}

// ==================== ASIGNACION DE CLIENTES POR VENTAS ====================
// Actualiza clientes.ter_core con el vendedor que le vendio mas recientemente
// (mlofac011, ultimo ano, ven_stat != '80').
// Regla: por cada cliente gana el vendedor de su venta mas reciente.
// Solo asigna si el vendedor existe en la tabla vendedores.
// Se ejecuta DESPUES de vendedores/clientes (clientes reescribe ter_core desde el ERP).

async function syncAsignacionesVentas() {
  const [ventas] = await erp.query(
    `SELECT ven_cote, ven_core, MAX(ven_feem) AS ultima_venta
     FROM mlofac011
     WHERE ven_feem BETWEEN DATE_SUB(CURRENT_DATE(), INTERVAL 1 YEAR) AND CURRENT_DATE()
       AND ven_stat != '80'
       AND ven_cote IS NOT NULL AND ven_cote != ''
       AND ven_core IS NOT NULL AND ven_core != ''
     GROUP BY ven_cote, ven_core
     ORDER BY ven_cote, ultima_venta DESC`
  );

  // Vendedores validos de la app
  const [vends] = await app.query('SELECT ter_cote FROM vendedores');
  const vendsSet = new Set(vends.map((v) => v.ter_cote));

  // Por cliente, la PRIMERA fila es su venta mas reciente (ORDER BY ... DESC)
  const asignaciones = new Map();
  for (const v of ventas) {
    const cote = String(v.ven_cote).trim();
    const core = String(v.ven_core).trim();
    if (!asignaciones.has(cote)) asignaciones.set(cote, core);
  }

  let actualizados = 0, sinCambio = 0, sinVendedor = 0, errores = 0;
  for (const [cliente, vendedor] of asignaciones) {
    if (!vendsSet.has(vendedor)) { sinVendedor++; continue; }
    try {
      const [r] = await app.query(
        `UPDATE clientes SET ter_core = ?
         WHERE ter_cote = ? AND (ter_core IS NULL OR ter_core <> ?)`,
        [vendedor, cliente, vendedor]
      );
      if (r.affectedRows > 0) actualizados++; else sinCambio++;
    } catch (e) {
      errores++;
      console.error(`Sync asignacion cliente=${cliente} vendedor=${vendedor} error:`, e.message);
    }
  }

  const detalle =
    `asignados=${actualizados} sin_cambio=${sinCambio}` +
    ` vendedor_no_existe=${sinVendedor}${errores > 0 ? ` err=${errores}` : ''}`;
  await logSync('ASIGNACIONES', actualizados, errores > 0 ? 'PARCIAL' : 'OK', detalle);
  return { actualizados, sin_cambio: sinCambio, vendedor_no_existe: sinVendedor };
}

// ==================== ORQUESTADOR PRINCIPAL ====================

const FUNCIONES_PARCIAL = {
  vendedores: syncVendedores,
  clientes: syncClientesParcial,
  condiciones: syncCondicionesPagoParcial,
  tipos: syncTiposDocumentoParcial,
  bancos: syncBancosParcial,
  articulos: syncArticulosParcial,
  compras: syncComprasParcial,
  precios: syncPrecios
};

const FUNCIONES_COMPLETO = {
  vendedores: syncVendedores,
  clientes: syncClientesCompleto,
  condiciones: syncCondicionesPagoCompleto,
  tipos: syncTiposDocumentoCompleto,
  bancos: syncBancosCompleto,
  articulos: syncArticulosCompleto,
  compras: syncComprasParcial,
  precios: syncPrecios
};

// Sincronizacion principal.
// - 'procesos': array de nombres de procesos a ejecutar. Si es null o vacio, ejecuta todos.
//   'maestros' es un alias retrocompatible que ejecuta 'vendedores' + 'clientes'.
// - 'modo': 'parcial' (REPLACE INTO, default) o 'completo' (DELETE + INSERT).
//   El modo completo solo aplica a clientes y tablas catalogo (condiciones, tipos, bancos, articulos).
//   VENDEDORES y USUARIOS siempre son SOLO ADICION: nunca eliminan ni reemplazan.
//   Documentos siempre es completo, incidencias siempre incremental.
//   INCIDENCIAS: solo sincroniza ERP → App (no envía desde la app al ERP).
async function syncCompleto(procesos = null, modo = 'parcial') {
  // Orden fijo: vendedores/clientes antes de asignaciones (asignaciones corrige ter_core).
  const validos = ['maestros', 'vendedores', 'clientes', 'asignaciones', 'condiciones', 'tipos', 'bancos', 'documentos', 'incidencias', 'usuarios', 'articulos', 'compras', 'precios'];
  let seleccion = (procesos && procesos.length ? procesos : validos)
    .filter((p) => validos.includes(p));
  const aliasMaestros = seleccion.includes('maestros');
  if (aliasMaestros) {
    seleccion = seleccion.filter((p) => p !== 'maestros');
    if (!seleccion.includes('vendedores')) seleccion.push('vendedores');
    if (!seleccion.includes('clientes')) seleccion.push('clientes');
  }
  seleccion.sort((a, b) => validos.indexOf(a) - validos.indexOf(b));
  const resultados = {};

  for (const proc of seleccion) {
    if (proc === 'documentos') {
      resultados.documentos = await syncDocumentos();
    } else if (proc === 'incidencias') {
      resultados.incidencias = await syncIncidencias();
    } else if (proc === 'usuarios') {
      resultados.usuarios = await syncUsuarios();
    } else if (proc === 'asignaciones') {
      resultados.asignaciones = await syncAsignacionesVentas();
    } else if (modo === 'completo' && FUNCIONES_COMPLETO[proc]) {
      resultados[proc] = await FUNCIONES_COMPLETO[proc]();
    } else if (FUNCIONES_PARCIAL[proc]) {
      resultados[proc] = await FUNCIONES_PARCIAL[proc]();
    }
  }

  // Compatibilidad: si se pidio 'maestros', se expone tambien con esa clave.
  if (aliasMaestros) {
    resultados.maestros = {
      vendedores: resultados.vendedores ? resultados.vendedores.nuevos : 0,
      clientes: resultados.clientes ? resultados.clientes.clientes : 0
    };
  }

  return resultados;
}

module.exports = {
  syncVendedores,
  syncClientes: syncClientesParcial,
  syncCondicionesPago: syncCondicionesPagoParcial,
  syncTiposDocumento: syncTiposDocumentoParcial,
  syncBancos: syncBancosParcial,
  syncArticulos: syncArticulosParcial,
  syncCompras: syncComprasParcial,
  syncPrecios,
  syncDocumentos,
  syncIncidencias,
  syncUsuarios,
  syncAsignacionesVentas,
  syncCompleto
};
