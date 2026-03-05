require('dotenv').config();

const express = require('express');
const path = require('path');
const conectarDB = require('./config/db');

const app = express();

// archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app principal
const mainApp = require('./app');
app.use(mainApp);

const PORT = process.env.PORT || 3000;

const iniciarServidor = async () => {
  try {

    // conectar base de datos primero
    await conectarDB();

    // iniciar servidor después de conectar la DB
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor escuchando en http://0.0.0.0:${PORT}`);
    });

  } catch (error) {

    console.error('🔴 No se pudo iniciar el servidor:', error);
    process.exit(1);

  }
};

iniciarServidor();