const erp = require('../config/erp');
const app = require('../config/db');

// Estados del ERP que cuentan como cobro/pago VALIDO (mficob200.cob_stat).
//   90 CERRADO  10 EMITIDO  18 EN DESCUENTO   (80 ANULADO no cuenta)
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

async function syncMaestros() {
  // ---------- VENDEDORES ----------
  const [vendedores] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_stat, t.ter_date,
            u.use_logi
     FROM mplter001 t
     LEFT JOIN mtguse001 u ON u.use_emno = t.ter_cote
     WHERE t.ter_tite = '300000'`
  );

  for (const v of vendedores) {
    await app.query(
      `REPLACE INTO vendedores (ter_cote, ter_deno, use_logi, ter_stat, ter_date, ultima_sync)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [v.ter_cote, v.ter_deno, v.use_logi || null, v.ter_stat, v.ter_date]
    );
  }

  // ---------- CLIENTES ----------
  const [clientes] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_dire, t.ter_rucn, t.ter_fono,
            t.ter_cell, t.ter_emai, t.ter_core, t.ter_cocp, t.ter_licr,
            t.ter_stat, t.ter_cozo
     FROM mplter001 t
     WHERE t.ter_tite = '100000'`
  );

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

  await logSync('MAESTROS', vendedores.length + clientes.length,
    'OK', `vend=${vendedores.length} cli=${clientes.length}`);

  return { vendedores: vendedores.length, clientes: clientes.length };
}

// Areas del ERP que definen perfiles de usuario:
//   100001 Gerencia -> gerencia | 100002 Tesoreria -> empleado
//   100003 Contabilidad -> contabilidad | 100004 Ventas -> vendedor
//   100008 Sistemas -> sistemas
// Solo empleados activos (ter_stat='10') con credenciales ERP (mtguse001).
const AREAS_PERFILES = {
  '100001': 'gerencia',
  '100002': 'empleado',
  '100003': 'contabilidad',
  '100004': 'vendedor',
  '100008': 'sistemas'
};

// Sincroniza usuarios vendedores/empleados desde el ERP.
// Solo empleados activos (ter_stat='10') de las areas definidas en AREAS_PERFILES
// y que tengan credenciales en mtguse001 (use_logi + use_pass).
// - Crea/actualiza el usuario local con la clave heredada del ERP (SHA1).
// - No sobrescribe claves ya migradas a bcrypt.
// - Comportamiento autoritativo: usuarios ERP que ya no califiquen se desactivan.
// - Nunca toca usuarios manuales (origen = 'MANUAL', ej. admins puros).
async function syncUsuarios() {
  const areas = Object.keys(AREAS_PERFILES).map(() => '?').join(',');
  const [usuarios] = await erp.query(
    `SELECT t.ter_cote, t.ter_deno, t.ter_area, t.ter_stat,
            u.use_logi, u.use_name, u.use_apel, u.use_pass, u.use_tipo
     FROM mplter001 t
     LEFT JOIN mtguse001 u ON u.use_emno = t.ter_cote
     WHERE t.ter_tite = '300000'
       AND t.ter_stat = '10'
       AND t.ter_area IN (${areas})`,
    Object.keys(AREAS_PERFILES)
  );

  let creados = 0;
  let actualizados = 0;
  let desactivados = 0;

  // Usuarios ERP sincronizados que deben permanecer activos (use_logi).
  const activos = new Set();

  for (const u of usuarios) {
    // Solo se registra si tiene credenciales ERP (login + clave).
    if (!u.use_logi || !u.use_pass) continue;

    const rol = AREAS_PERFILES[u.ter_area];
    if (!rol) continue;

    activos.add(u.use_logi);

    // No pisar claves bcrypt ya migradas.
    const [exist] = await app.query(
      `SELECT id, use_pass FROM usuarios_app WHERE use_logi = ?`,
      [u.use_logi]
    );

    let use_pass;
    if (exist.length > 0 && exist[0].use_pass && exist[0].use_pass.startsWith('$2')) {
      use_pass = exist[0].use_pass;
    } else {
      use_pass = u.use_pass; // SHA1 heredado del ERP
    }

    const nombre = u.use_name || '';
    const apellido = u.use_apel || '';

    const [res] = await app.query(
      `INSERT INTO usuarios_app
         (ter_cote, use_logi, use_pass, use_name, use_apel, rol, activo, origen)
       VALUES (?, ?, ?, ?, ?, ?, 1, 'ERP')
       ON DUPLICATE KEY UPDATE
         ter_cote = VALUES(ter_cote),
         use_pass = VALUES(use_pass),
         use_name = VALUES(use_name),
         use_apel = VALUES(use_apel),
         rol = VALUES(rol),
         activo = 1,
         origen = 'ERP'`,
      [u.ter_cote, u.use_logi, use_pass, nombre, apellido, rol]
    );

    if (res.affectedRows === 1) creados++;
    else actualizados++;
  }

  // Desactivar usuarios ERP que ya no califiquen (inactivos, fuera de area, sin ERP).
  const [erpUsers] = await app.query(
    `SELECT use_logi FROM usuarios_app WHERE origen = 'ERP'`
  );
  for (const u of erpUsers) {
    if (!activos.has(u.use_logi)) {
      await app.query(
        `UPDATE usuarios_app SET activo = 0 WHERE use_logi = ? AND origen = 'ERP'`,
        [u.use_logi]
      );
      desactivados++;
    }
  }

  await logSync('USUARIOS', creados + actualizados,
    'OK', `nuevos=${creados} actualizados=${actualizados} desactivados=${desactivados}`);

  return { usuarios: creados + actualizados, creados, actualizados, desactivados };
}

async function syncCondicionesPago() {
  const [conds] = await erp.query(
    `SELECT com_cocp, com_dscp, com_ticp FROM mplcom010`
  );

  for (const c of conds) {
    await app.query(
      `REPLACE INTO condiciones_pago (com_cocp, com_dscp, com_ticp)
       VALUES (?, ?, ?)`,
      [c.com_cocp, c.com_dscp, c.com_ticp]
    );
  }

  await logSync('CONDICIONES_PAGO', conds.length,
    'OK', `cond=${conds.length}`);

  return { condiciones: conds.length };
}

async function syncTiposDocumento() {
  // Tipos de documento desde el ERP (mplgen003, definicion principal gen_subd=0).
  const [tipos] = await erp.query(
    `SELECT gen_codo, gen_dsdo
     FROM mplgen003
     WHERE gen_subd = 0
     GROUP BY gen_codo, gen_dsdo`
  );

  for (const t of tipos) {
    await app.query(
      `REPLACE INTO tipos_documento (cob_codo, doc_descripcion)
       VALUES (?, ?)`,
      [t.gen_codo, t.gen_dsdo]
    );
  }

  // Codigo 71 no esta en mplgen003 pero existe en mficob100 (letras/cuotas).
  await app.query(
    `REPLACE INTO tipos_documento (cob_codo, doc_descripcion)
     VALUES ('71', 'Letra')`
  );

  await logSync('TIPOS_DOCUMENTO', tipos.length + 1,
    'OK', `tipos=${tipos.length}`);

  return { tipos: tipos.length };
}

async function syncBancos() {
  // Bancos desde el ERP (mplcob002), usados para ubicar las letras.
  const [bancos] = await erp.query(
    `SELECT ban_codi, ban_desc FROM mplcob002`
  );

  for (const b of bancos) {
    await app.query(
      `REPLACE INTO bancos (ban_codi, ban_desc)
       VALUES (?, ?)`,
      [b.ban_codi, b.ban_desc]
    );
  }

  await logSync('BANCOS', bancos.length, 'OK', `bancos=${bancos.length}`);

  return { bancos: bancos.length };
}

async function syncDocumentos() {
  const placeholders = ESTADOS_PAGO_VALIDOS.map(() => '?').join(',');
  const excl = ESTADOS_DOC_EXCLUIDOS.map(() => '?').join(',');

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
       d.cob_banc,
       d.cob_nuni,
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
              d.cob_cocp, d.cob_stat, d.cob_banc, d.cob_nuni,
              d.doc_impo, d.cob_impo, d.cob_imps, d.cob_impd
     HAVING (d.cob_impo - COALESCE(SUM(p.cob_impc), 0)) > 0.01`,
    [...ESTADOS_PAGO_VALIDOS, ...ESTADOS_DOC_EXCLUIDOS]
  );

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
          cob_banc, cob_nuni,
          doc_impo, cob_impo, cob_imps, cob_impd, pagado, saldo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.cob_tivo, d.cob_nuvo, d.cob_codo, d.cob_seri, d.cob_nums,
       d.cob_cote, d.cob_feem, d.cob_feve, monedaApp, d.cob_core,
       d.cob_cocp, d.cob_stat, d.cob_banc, d.cob_nuni,
       d.doc_impo, d.cob_impo, d.cob_imps,
       d.cob_impd, pagado, Number(saldo.toFixed(2))]
    );
    insertados++;
  }

  await logSync('DOCUMENTOS', insertados);

  return { documentos: insertados };
}

// Descarga de incidencias desde el ERP (mcoinci010 + mcoinci020).
// Solo lectura en el ERP; se insertan/actualizan en la BD local.
// La identidad es inc_codi del ERP -> incidencias.inc_codi_erp (unico).
async function syncIncidencias() {
  const [inc] = await erp.query(
    `SELECT inc_codi, ter_cote, use_emno, inc_cont, inc_desc,
            fe_regi, fe_aten, fe_resu, inc_esta, inc_estc
     FROM mcoinci010`
  );

  // Traer todo el detalle de una vez (mcoinci020)
  const [det] = await erp.query(
    `SELECT inc_codi, inc_nro, inc_desc, inc_resp, inc_stat
     FROM mcoinci020`
  );
  const detByInc = new Map();
  for (const d of det) {
    if (!detByInc.has(d.inc_codi)) detByInc.set(d.inc_codi, []);
    detByInc.get(d.inc_codi).push(d);
  }

  let insertados = 0;
  let actualizados = 0;

  for (const r of inc) {
    const exist = await app.query(
      'SELECT inc_codi FROM incidencias WHERE inc_codi_erp = ?',
      [r.inc_codi]
    );

    if (exist[0].length > 0) {
      await app.query(
        `UPDATE incidencias
            SET ter_cote = ?, use_emno = ?, inc_cont = ?, inc_desc = ?,
                fe_regi = ?, fe_aten = ?, fe_resu = ?, inc_esta = ?,
                inc_estc = ?, sincronizada = 1, ultima_sync = NOW()
          WHERE inc_codi_erp = ?`,
        [r.ter_cote, r.use_emno, r.inc_cont, r.inc_desc,
         r.fe_regi, r.fe_aten, r.fe_resu, r.inc_esta, r.inc_estc, r.inc_codi]
      );
      actualizados++;
    } else {
      const [res] = await app.query(
        `INSERT INTO incidencias
           (inc_codi_erp, ter_cote, use_emno, inc_cont, inc_desc,
            fe_regi, fe_aten, fe_resu, inc_esta, inc_estc,
            sincronizada, ultima_sync)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
        [r.inc_codi, r.ter_cote, r.use_emno, r.inc_cont, r.inc_desc,
         r.fe_regi, r.fe_aten, r.fe_resu, r.inc_esta, r.inc_estc]
      );
      insertados++;
      // Copiar el detalle (mcoinci020) de esta incidencia
      const detalles = detByInc.get(r.inc_codi) || [];
      for (const dd of detalles) {
        await app.query(
          `INSERT INTO incidencia_detalle (inc_codi, inc_nro, inc_desc, inc_resp, inc_stat)
           VALUES (?, ?, ?, ?, ?)`,
          [res.insertId, dd.inc_nro, dd.inc_desc, dd.inc_resp, dd.inc_stat]
        );
      }
    }
  }

  await logSync('INCIDENCIAS', insertados + actualizados,
    'OK', `nuevas=${insertados} actualizadas=${actualizados}`);

  return { incidencias: insertados, actualizadas: actualizados };
}

// Sincronizacion completa: maestros + condiciones + tipos + bancos
// + documentos + incidencias + usuarios.
// 'procesos' permite ejecutar solo un subconjunto (ej: ['maestros']).
// Los nombres validos: maestros, condiciones, tipos, bancos, documentos, incidencias, usuarios.
async function syncCompleto(procesos = null) {
  const validos = ['maestros', 'condiciones', 'tipos', 'bancos', 'documentos', 'incidencias', 'usuarios'];
  const seleccion = procesos && procesos.length ? procesos : validos;
  const resultados = {};

  if (seleccion.includes('maestros')) resultados.maestros = await syncMaestros();
  if (seleccion.includes('condiciones')) resultados.condiciones = await syncCondicionesPago();
  if (seleccion.includes('tipos')) resultados.tipos = await syncTiposDocumento();
  if (seleccion.includes('bancos')) resultados.bancos = await syncBancos();
  if (seleccion.includes('documentos')) resultados.documentos = await syncDocumentos();
  if (seleccion.includes('incidencias')) resultados.incidencias = await syncIncidencias();
  if (seleccion.includes('usuarios')) resultados.usuarios = await syncUsuarios();

  return resultados;
}

module.exports = {
  syncMaestros,
  syncCondicionesPago,
  syncTiposDocumento,
  syncBancos,
  syncDocumentos,
  syncIncidencias,
  syncUsuarios,
  syncCompleto
};