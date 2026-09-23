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
    if (r.articulos) console.log(`  Articulos: ${r.articulos.articulos}`);
    if (r.compras) console.log(`  Compras: ${r.compras.compras}`);
    if (r.precios) console.log(`  Precios: ${r.precios.precios}`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR en sync:', err);
    process.exit(1);
  }
}

main();