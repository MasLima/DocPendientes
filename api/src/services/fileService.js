const fs = require('fs');
const path = require('path');

const CARPETAS_PERMITIDAS = (process.env.WHATSAPP_CARPETAS || 'C:\\Catalogos,C:\\Precios').split(',').map(s => s.trim());
const MAX_SIZE_MB = parseInt(process.env.WHATSAPP_MAX_SIZE_MB || '50', 10);

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip'
};

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

function esCarpetaPermitida(ruta) {
  const norm = path.normalize(ruta);
  return CARPETAS_PERMITIDAS.some(carpeta => norm.startsWith(path.normalize(carpeta)));
}

function listarArchivos(ruta) {
  if (!esCarpetaPermitida(ruta)) throw new Error('Carpeta no permitida');
  if (!fs.existsSync(ruta)) throw new Error('Carpeta no encontrada');

  const entries = fs.readdirSync(ruta, { withFileTypes: true });
  return entries
    .filter(e => e.isFile())
    .map(e => {
      const filePath = path.join(ruta, e.name);
      const stat = fs.statSync(filePath);
      const ext = path.extname(e.name).toLowerCase();
      let tipo = 'otro';
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) tipo = 'imagen';
      else if (ext === '.pdf') tipo = 'pdf';
      else if (['.xlsx', '.xls'].includes(ext)) tipo = 'excel';
      else if (['.docx', '.doc'].includes(ext)) tipo = 'word';
      else if (ext === '.csv') tipo = 'csv';

      return {
        nombre: e.name,
        ruta: filePath,
        tipo,
        tamano: stat.size,
        modificado: stat.mtime
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

function validarArchivo(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Archivo no encontrado');
  const stat = fs.statSync(filePath);
  const sizeMB = stat.size / (1024 * 1024);
  if (sizeMB > MAX_SIZE_MB) throw new Error(`Archivo excede ${MAX_SIZE_MB} MB`);
  return { existe: true, tamano: stat.size, mime: getMime(filePath) };
}

function getCarpetasPermitidas() {
  return CARPETAS_PERMITIDAS;
}

module.exports = { listarArchivos, validarArchivo, getMime, getCarpetasPermitidas, esCarpetaPermitida };
