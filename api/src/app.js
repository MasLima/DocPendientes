const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const auth = require('./middleware/auth');
const pool = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
const fileUpload = require('express-fileupload');
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

// Archivos estaticos del frontend (web/dist)
app.use(express.static(path.join(__dirname, '../../web/dist')));

// APK mas reciente en la carpeta apk/ (por version del nombre o fecha)
function apkMasReciente() {
  const apkDir = path.join(__dirname, '../../apk');
  const files = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
  if (files.length === 0) return null;
  const ordenados = files.map((f) => {
    const m = f.match(/(\d+)\.(\d+)\.(\d+)/);
    const st = fs.statSync(path.join(apkDir, f));
    return { f, ruta: path.join(apkDir, f), tamano: st.size, v: m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null, t: st.mtimeMs };
  }).sort((a, b) => {
    if (a.v && b.v) {
      for (let i = 0; i < 3; i++) if (a.v[i] !== b.v[i]) return b.v[i] - a.v[i];
      return b.t - a.t;
    }
    if (a.v) return -1;
    if (b.v) return 1;
    return b.t - a.t;
  });
  const e = ordenados[0];
  return { nombre: e.f, ruta: e.ruta, tamano: e.tamano, version: e.v ? e.v.join('.') : null };
}

// Version del APK disponible - sin autenticacion (la consulta el actualizador in-app)
app.get('/api/version', (req, res) => {
  const apk = apkMasReciente();
  if (!apk) return res.status(404).json({ error: 'APK no encontrado' });
  res.json({ version: apk.version, nombre: apk.nombre, tamano: apk.tamano, url: '/api/download/apk' });
});

// Descarga APK - sin autenticacion
// Sirve SIEMPRE la version mas reciente (por version del nombre o fecha del archivo)
app.get('/api/download/apk', (req, res) => {
  const apk = apkMasReciente();
  if (!apk) return res.status(404).json({ error: 'APK no encontrado' });
  res.setHeader('Content-Disposition', `attachment; filename="${apk.nombre}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Length', apk.tamano);
  fs.createReadStream(apk.ruta).pipe(res);
});

// Rutas publicas
app.use('/api/auth', require('./routes/auth'));

// Rutas protegidas con JWT
app.use('/api/clientes', auth, require('./routes/clientes'));
app.use('/api/documentos', auth, require('./routes/documentos'));
app.use('/api/incidencias', auth, require('./routes/incidencias'));
app.use('/api/reportes', auth, require('./routes/reportes'));
app.use('/api/usuarios', auth, require('./routes/usuarios'));
app.use('/api/perfiles', auth, require('./routes/perfiles'));
app.use('/api/sync', auth, require('./routes/sync'));
app.use('/api/dashboard', auth, require('./routes/dashboard'));
app.use('/api/articulos', auth, require('./routes/articulos'));
app.use('/api/whatsapp', auth, require('./routes/whatsapp'));
app.use('/api/config/vencimientos', auth, require('./routes/configVencimientos'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// Fallback: servir index.html para rutas del frontend (React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../web/dist/index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

module.exports = app;