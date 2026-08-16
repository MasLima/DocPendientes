const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const pool = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Rutas publicas
app.use('/api/auth', require('./routes/auth'));

// Rutas protegidas con JWT
app.use('/api/clientes', auth, require('./routes/clientes'));
app.use('/api/documentos', auth, require('./routes/documentos'));
app.use('/api/incidencias', auth, require('./routes/incidencias'));
app.use('/api/reportes', auth, require('./routes/reportes'));
app.use('/api/usuarios', auth, require('./routes/usuarios'));
app.use('/api/sync', auth, require('./routes/sync'));
app.use('/api/dashboard', auth, require('./routes/dashboard'));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'conectada' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

module.exports = app;