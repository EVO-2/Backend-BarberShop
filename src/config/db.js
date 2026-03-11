// db.js
const mongoose = require('mongoose');
require('dotenv').config();

let conectado = false;

const conectarDB = async () => {
  if (conectado) {
    console.log('🟡 MongoDB ya estaba conectado');
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI?.trim(); // eliminar espacios invisibles

  if (!uri) {
    console.error('🔴 ERROR: MONGODB_URI no está definida en .env');
    process.exit(1);
  }

  try {
    console.log('📦 Intentando conectar a MongoDB...');

    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,

      // Pool de conexiones optimizado
      maxPoolSize: 20,
      minPoolSize: 5,

      // estabilidad red
      family: 4,

      // soporte transacciones replica set
      retryWrites: true,
      w: 'majority'
    });

    conectado = true;

    console.log(`🟢 Conexión a MongoDB exitosa: ${mongoose.connection.name}`);

    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose conectado a MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('🔴 Error en MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('🟡 MongoDB desconectado');
      conectado = false;
    });

    // Cierre limpio del servidor
    const cerrarConexion = async () => {
      try {
        await mongoose.connection.close();
        console.log('🔴 Conexión MongoDB cerrada');
        process.exit(0);
      } catch (error) {
        console.error('🔴 Error cerrando MongoDB:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', cerrarConexion);
    process.on('SIGTERM', cerrarConexion);

    return mongoose.connection;

  } catch (error) {
    console.error('🔴 Error al conectar MongoDB:', error.message);

    // reintento automático
    setTimeout(conectarDB, 5000);
  }
};

module.exports = conectarDB;