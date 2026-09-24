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

// Descarga APK - sin autenticacion
app.get('/api/download/apk', (req, res) => {
  const apkDir = path.join(__dirname, '../../apk');
  const files = fs.readdirSync(apkDir).filter(f => f.endsWith('.apk'));
  if (files.length === 0) return res.status(404).json({ error: 'APK no encontrado' });
  const apkFile = path.join(apkDir, files[0]);
  res.setHeader('Content-Disposition', `attachment; filename="${files[0]}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  fs.createReadStream(apkFile).pipe(res);
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