const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const SESSION_DIR = path.join(__dirname, '..', '..', 'whatsapp-session');

let client = null;
let estado = 'desconectado';
let qrCode = null;
let infoConexion = null;

function inicializar() {
  if (client) return;

  if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

  client = new Client({
    authStrategy: new (require('whatsapp-web.js').LocalAuth)({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  client.on('qr', (qr) => {
    qrCode = qr;
    estado = 'esperando_qr';
    console.log('[WA] QR generado. Escanear con WhatsApp.');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    estado = 'conectado';
    qrCode = null;
    infoConexion = client.info;
    console.log(`[WA] Conectado como: ${infoConexion?.pushname || 'Desconocido'} (${infoConexion?.wid?.user || '-'})`);
    console.log(`[WA] Número conectado (remitente): ${infoConexion?.wid?.user || 'desconocido'}`);
  });

  client.on('authenticated', () => {
    estado = 'autenticado';
    console.log('[WA] Autenticado correctamente.');
  });

  client.on('auth_failure', (msg) => {
    estado = 'error';
    console.error('[WA] Fallo de autenticación:', msg);
  });

  client.on('disconnected', (reason) => {
    estado = 'desconectado';
    infoConexion = null;
    console.log('[WA] Desconectado:', reason);
  });

  client.initialize().catch((err) => {
    estado = 'error';
    console.error('[WA] Error al inicializar:', err.message);
  });
}

function getEstado() {
  if (!client && estado === 'desconectado') {
    inicializar();
  }
  return {
    estado,
    qrDisponible: estado === 'esperando_qr',
    conexion: infoConexion ? {
      nombre: infoConexion.pushname,
      telefono: infoConexion.wid?.user || null
    } : null
  };
}

function getQR() {
  return qrCode;
}

async function desconectar() {
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
    estado = 'desconectado';
    infoConexion = null;
    qrCode = null;
  }
}

function getChatId(telefono) {
  const limpio = telefono.replace(/[^0-9]/g, '');
  const final = limpio.startsWith('51') ? limpio : `51${limpio}`;
  console.log(`[WA] getChatId: input="${telefono}" -> limpio="${limpio}" -> chatId="${final}@c.us"`);
  return `${final}@c.us`;
}

async function enviarMensaje(telefono, texto) {
  if (!client || estado !== 'conectado') throw new Error('WhatsApp no conectado');
  const chatId = getChatId(telefono);
  const remitente = client.info?.wid?.user || 'desconocido';
  console.log(`[WA] ENVIAR: remitente=${remitente} -> destinatario=${chatId}`);
  const result = await client.sendMessage(chatId, texto);
  return { ok: true, id: result?.id?._serialized || result?.id || 'ok' };
}

async function enviarImagen(telefono, imagenUrl, caption = '') {
  if (!client || estado !== 'conectado') throw new Error('WhatsApp no conectado');
  const chatId = getChatId(telefono);
  console.log(`[WA] Descargando imagen: ${imagenUrl}`);
  let media;
  try {
    media = await MessageMedia.fromUrl(imagenUrl, { unsafeMime: true });
  } catch (err) {
    console.error(`[WA] Error descargando imagen: ${imagenUrl} - ${err.message}`);
    throw new Error(`No se pudo descargar la imagen: ${err.message}`);
  }
  console.log(`[WA] Imagen descargada OK (${media.mimetype}), enviando a ${chatId}`);
  const result = await client.sendMessage(chatId, media, { caption });
  return { ok: true, id: result?.id?._serialized || result?.id || 'ok' };
}

async function enviarArchivoLocal(telefono, filePath, caption = '', sendAsDocument = true) {
  if (!client || estado !== 'conectado') throw new Error('WhatsApp no conectado');
  if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado');
  const chatId = getChatId(telefono);
  const media = MessageMedia.fromFilePath(filePath);
  const result = await client.sendMessage(chatId, media, {
    caption,
    sendMediaAsDocument: sendAsDocument
  });
  return { ok: true, id: result?.id?._serialized || result?.id || 'ok' };
}

async function enviarArchivoBuffer(telefono, buffer, mimeType, filename, caption = '', sendAsDocument = true) {
  if (!client || estado !== 'conectado') throw new Error('WhatsApp no conectado');
  const chatId = getChatId(telefono);
  const media = new MessageMedia(mimeType, buffer.toString('base64'), filename);
  const result = await client.sendMessage(chatId, media, {
    caption,
    sendMediaAsDocument: sendAsDocument
  });
  return { ok: true, id: result?.id?._serialized || result?.id || 'ok' };
}

async function enviarMixto(telefono, { mensaje, imagenUrl, archivos }) {
  if (!client || estado !== 'conectado') throw new Error('WhatsApp no conectado');
  const chatId = getChatId(telefono);
  const resultados = [];

  if (mensaje) {
    const r = await client.sendMessage(chatId, mensaje);
    resultados.push({ tipo: 'texto', id: r?.id?._serialized || r?.id || 'ok' });
  }

  if (imagenUrl) {
    const media = await MessageMedia.fromUrl(imagenUrl, { unsafeMime: true });
    const r = await client.sendMessage(chatId, media, { caption: '' });
    resultados.push({ tipo: 'imagen', id: r?.id?._serialized || r?.id || 'ok' });
  }

  if (archivos && archivos.length > 0) {
    for (const filePath of archivos) {
      if (fs.existsSync(filePath)) {
        const media = MessageMedia.fromFilePath(filePath);
        const r = await client.sendMessage(chatId, media, { sendMediaAsDocument: true });
        resultados.push({ tipo: 'archivo', archivo: path.basename(filePath), id: r?.id?._serialized || r?.id || 'ok' });
      }
    }
  }

  return { ok: true, mensajes: resultados };
}

async function getContactos(busqueda = '') {
  if (!client || estado !== 'conectado') throw new Error('WhatsApp no conectado');

  try {
    if (!client.pupPage) {
      console.error('[WA] puppeteer page no disponible');
      return [];
    }
    const contacts = await client.getContacts();
    let filtrados = contacts.filter(c => c.isWAContact && (c.number || c.id?.user));
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter(c => {
        const num = c.number || c.id?.user || '';
        return (c.name || '').toLowerCase().includes(q) ||
               (c.pushname || '').toLowerCase().includes(q) ||
               num.includes(q);
      });
    }
    return filtrados.slice(0, 50).map(c => ({
      nombre: c.name || c.pushname || 'Desconocido',
      telefono: c.number || c.id?.user || '',
      isMyContact: c.isMyContact
    }));
  } catch (err) {
    console.error('[WA] Error obteniendo contactos:', err.message);
    return [];
  }
}

module.exports = {
  inicializar,
  getEstado,
  getQR,
  desconectar,
  enviarMensaje,
  enviarImagen,
  enviarArchivoLocal,
  enviarArchivoBuffer,
  enviarMixto,
  getChatId,
  getContactos
};
