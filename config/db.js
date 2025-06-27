// config/db.js
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // Ej: localhost
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// Crear y exportar el pool de conexión
const pool = new sql.ConnectionPool(dbConfig);
const poolConnect = pool.connect();

module.exports = {
  sql,
  pool,
  poolConnect
};
