const sql = require('mssql');
require('dotenv').config();

const dbSettings = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

/*console.log('CONFIG BD:', dbSettings); // 👈 Confirmar valores de conexión
console.log('Intentando conectar a la base de datos...');*/

const pool = new sql.ConnectionPool(dbSettings);
const poolConnect = pool.connect();

module.exports = { sql, pool, poolConnect };
