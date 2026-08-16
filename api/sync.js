require('dotenv').config();
const { syncCompleto } = require('./src/services/syncService');

async function main() {
  try {
    const r = await syncCompleto();
    console.log('====================');
    console.log('SYNC COMPLETADO OK');
    console.log(`  Vendedores: ${r.maestros.vendedores}`);
    console.log(`  Clientes:   ${r.maestros.clientes}`);
    console.log(`  Pendientes: ${r.documentos.documentos}`);
    console.log(`  Incidencias nuevas: ${r.incidencias.incidencias}`);
    console.log(`  Incidencias actualizadas: ${r.incidencias.actualizadas}`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR en sync:', err);
    process.exit(1);
  }
}

main();