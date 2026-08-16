const mysql = require('mysql2/promise');
require('dotenv').config();

// Pool de conexion al ERP. SOLO LECTURA.
// El usuario del ERP debe tener permisos de SELECT nada mas.
const erp = mysql.createPool({
  host: process.env.ERP_HOST,
  port: Number(process.env.ERP_PORT) || 3306,
  user: process.env.ERP_USER,
  password: process.env.ERP_PASSWORD,
  database: process.env.ERP_DB,
  connectionLimit: 5,
  waitForConnections: true,
  dateStrings: true,
  connectTimeout: 30000
});

module.exports = erp;
