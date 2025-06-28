const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT),
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false, // Cambiar a true si usas Azure
      trustServerCertificate: true
    }
  },
  logging: false // Cambia a true si quieres ver las queries en consola
});

module.exports = sequelize;
