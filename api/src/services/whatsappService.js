const { Client, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

const SESSION_DIR = path.join(__dirname, '..', '..', 'whatsapp-session');

let client = null;
let estado = 'desconectado';
let qrCode = null;
let infoConexion = null;
let reconectando = false;
let timerReconexion = null;
let intentosReconexion = 0;
let fallosAuth = 0;
let desconexionManual = false;

function programarReconexion(motivo) {
  if (desconexionManual || reconectando) return;
  reconectando = true;
  estado = 'reconectando';
  intentosReconexion += 1;
  const retrasos = [2000, 5000, 10000, 20000, 40000, 60000];
  const retraso = retrasos[Math.min(intentosReconexion - 1, retrasos.length - 1)];
  console.log(`[WA] Reconexión #${intentosReconexion} en ${retraso / 1000}s — motivo: ${motivo}`);
  const viejo = client;
  client = null;
  infoConexion = null;
  qrCode = null;
  if (viejo) {
    try {
      const p = viejo.destroy();
      if (p && p.catch) p.catch(() => {});
    } catch {}
  }
  if (timerReconexion) clearTimeout(timerReconexion);
  timerReconexion = setTimeout(() => {
    timerReconexion = null;
    if (desconexionManual) { reconectando = false; estado = 'desconectado'; return; }
    inicializar();
  }, retraso);
}

function inicializar() {
  if (client) return;
  if (timerReconexion) { clearTimeout(timerReconexion); timerReconexion = null; }
  reconectando = false;
  desconexionManual = false;
  estado = 'iniciando';

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
    intentosReconexion = 0;
    fallosAuth = 0;
    infoConexion = client.info;
    console.log(`[WA] Conectado como: ${infoConexion?.pushname || 'Desconocido'} (${infoConexion?.wid?.user || '-'})`);
    console.log(`[WA] Número conectado (remitente): ${infoConexion?.wid?.user || 'desconocido'}`);
  });

  client.on('authenticated', () => {
    estado = 'autenticado';
    intentosReconexion = 0;
    fallosAuth = 0;
    console.log('[WA] Autenticado correctamente.');
  });

  client.on('auth_failure', (msg) => {
    estado = 'error';
    fallosAuth += 1;
    console.error('[WA] Fallo de autenticación:', msg);
    if (fallosAuth >= 2) {
      fallosAuth = 0;
      try {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        console.log('[WA] Sesión inválida eliminada. Se generará un QR nuevo.');
      } catch {}
    }
    if (!desconexionManual) programarReconexion(`fallo de autenticación: ${msg}`);
  });

  client.on('disconnected', (reason) => {
    infoConexion = null;
    console.log('[WA] Desconectado:', reason);
    if (desconexionManual) { estado = 'desconectado'; qrCode = null; return; }
    if (reconectando) return;
    programarReconexion(`desconectado (${reason})`);
  });

  client.initialize().catch((err) => {
    console.error('[WA] Error al inicializar:', err.message);
    if (desconexionManual) { estado = 'desconectado'; return; }
    programarReconexion(`error al iniciar: ${err.message}`);
  });
}

function getEstado() {
  if (!desconexionManual && !reconectando && !timerReconexion) {
    if (!client && (estado === 'desconectado' || estado === 'error')) {
      inicializar();
    } else if (client && (estado === 'desconectado' || estado === 'error')) {
      programarReconexion('estado estancado');
    }
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
  desconexionManual = true;
  reconectando = false;
  if (timerReconexion) { clearTimeout(timerReconexion); timerReconexion = null; }
  if (client) {
    try { await client.destroy(); } catch {}
    client = null;
  }
  estado = 'desconectado';
  infoConexion = null;
  qrCode = null;
}

async function asegurarConexion(maxMs = 15000) {
  if (estado === 'conectado' && client && client.pupPage) return true;
  if (desconexionManual) return false;
  if (estado !== 'conectado') getEstado();
  const limite = Date.now() + maxMs;
  while (Date.now() < limite) {
    if (estado === 'conectado') {
      if (client && client.pupPage) return true;
      if (!reconectando && !timerReconexion) programarReconexion('página del navegador no disponible');
    } else if (estado === 'esperando_qr') {
      return false;
    }
    await new Promise(r => setTimeout(r, 500));
  }
  return estado === 'conectado' && !!(client && client.pupPage);
}

async function asegurarListo(maxMs) {
  if (estado === 'conectado' && client && client.pupPage) return;
  const ok = await asegurarConexion(maxMs);
  if (!ok) {
    throw new Error(estado === 'esperando_qr'
      ? 'WhatsApp requiere escanear el QR'
      : 'WhatsApp no conectado');
  }
}

function getChatId(telefono) {
  const limpio = telefono.replace(/[^0-9]/g, '');
  const final = limpio.startsWith('51') ? limpio : `51${limpio}`;
  console.log(`[WA] getChatId: input="${telefono}" -> limpio="${limpio}" -> chatId="${final}@c.us"`);
  return `${final}@c.us`;
}

async function enviarMensaje(telefono, texto) {
  await asegurarListo();
  const chatId = getChatId(telefono);
  const remitente = client.info?.wid?.user || 'desconocido';
  console.log(`[WA] ENVIAR: remitente=${remitente} -> destinatario=${chatId}`);
  const result = await client.sendMessage(chatId, texto);
  return { ok: true, id: result?.id?._serialized || result?.id || 'ok' };
}

async function enviarImagen(telefono, imagenUrl, caption = '') {
  await asegurarListo();
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
  await asegurarListo();
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
  await asegurarListo();
  const chatId = getChatId(telefono);
  const media = new MessageMedia(mimeType, buffer.toString('base64'), filename);
  const result = await client.sendMessage(chatId, media, {
    caption,
    sendMediaAsDocument: sendAsDocument
  });
  return { ok: true, id: result?.id?._serialized || result?.id || 'ok' };
}

async function enviarMixto(telefono, { mensaje, imagenUrl, archivos }) {
  await asegurarListo();
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
  await asegurarListo();

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
  asegurarConexion,
  enviarMensaje,
  enviarImagen,
  enviarArchivoLocal,
  enviarArchivoBuffer,
  enviarMixto,
  getChatId,
  getContactos
};
