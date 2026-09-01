require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3000;

// Escucha en 0.0.0.0 para aceptar conexiones desde cualquier IP (red local/ pública)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API de Cobranza corriendo en http://0.0.0.0:${PORT}`);
});
