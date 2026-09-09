function articuloIndividual(art) {
  const lineas = [];
  lineas.push(`🏷 *${art.ite_dsit || art.ite_item}*`);
  lineas.push(`Código: ${art.ite_item}`);
  if (art.linea_desc) lineas.push(`Línea: ${art.linea_desc}`);
  if (art.familia_desc) lineas.push(`Familia: ${art.familia_desc}`);
  if (art.saldo != null) lineas.push(`Saldo: ${art.saldo} ${art.ustock_abrev || ''}`);
  if (art.ite_pruv) lineas.push(`Precio: S/. ${Number(art.ite_pruv).toFixed(2)}`);
  return lineas.join('\n');
}

function articuloMultiple(arts) {
  const lineas = ['📦 *Catálogo de Productos*\n'];
  arts.forEach((a, i) => {
    const precio = a.ite_pruv ? `S/. ${Number(a.ite_pruv).toFixed(2)}` : '';
    const stock = a.saldo != null ? `${a.saldo} ${a.ustock_abrev || ''}` : '';
    lineas.push(`${i + 1}. *${a.ite_dsit || a.ite_item}*`);
    lineas.push(`   Código: ${a.ite_item}${precio ? ` | ${precio}` : ''}${stock ? ` | Stock: ${stock}` : ''}`);
  });
  return lineas.join('\n');
}

function saludoCliente(cliente, texto) {
  const nombre = cliente.ter_deno || 'estimado cliente';
  return `Hola ${nombre},\n\n${texto}`;
}

function datosCliente(cliente) {
  const lineas = [];
  lineas.push(`👤 *${cliente.ter_deno || 'Cliente'}*`);
  if (cliente.ter_cote) lineas.push(`Código: ${cliente.ter_cote}`);
  if (cliente.ter_rucn) lineas.push(`RUC: ${cliente.ter_rucn}`);
  if (cliente.ter_dire) lineas.push(`Dirección: ${cliente.ter_dire}`);
  if (cliente.ter_cell) lineas.push(`Celular: ${cliente.ter_cell}`);
  if (cliente.ter_fono) lineas.push(`Teléfono: ${cliente.ter_fono}`);
  if (cliente.ter_emai) lineas.push(`Email: ${cliente.ter_emai}`);
  if (cliente.vendedor_nombre) lineas.push(`Vendedor: ${cliente.vendedor_nombre}`);
  return lineas.join('\n');
}

function recordatorio(cliente, documentos) {
  const nombre = cliente.ter_deno || 'estimado cliente';
  const total = documentos.length;
  const totalS = documentos.reduce((s, d) => s + Number(d.saldo || 0), 0);
  return `Hola ${nombre},\n\nTiene ${total} documento(s) pendiente(s) por un total de S/. ${totalS.toFixed(2)}.\nLe agradeceríamos regularizar su situación.`;
}

function personalizado(cliente, texto) {
  return saludoCliente(cliente, texto);
}

module.exports = { articuloIndividual, articuloMultiple, saludoCliente, datosCliente, recordatorio, personalizado };
