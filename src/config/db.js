const mongoose = require('mongoose');

let conectado = false;

const conectarDB = async () => {

  if (conectado) {
    const mongoose = require('mongoose');

    let conectado = false;

    const conectarDB = async () => {

      if (conectado) {
        console.log('🟡 MongoDB ya estaba conectado');
        return mongoose.connection;
      }

      const uri = process.env.MONGODB_URI;

      if (!uri) {
        console.error('🔴 ERROR: MONGODB_URI no está definida en .env');
        process.exit(1);
      }

      try {

        console.log('📦 Intentando conectar a MongoDB...');

        await mongoose.connect(uri, {
          autoIndex: process.env.NODE_ENV !== 'production', // índices solo en dev
          maxPoolSize: 10, // conexiones simultáneas
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          family: 4
        });

        conectado = true;

        console.log(`🟢 Conexión a MongoDB exitosa: ${mongoose.connection.name}`);

        // -------------------------
        // Eventos de conexión
        // -------------------------

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

        mongoose.connection.on('reconnected', () => {
          console.log('🟢 MongoDB reconectado');
        });

        // -------------------------
        // Cierre limpio del servidor
        // -------------------------

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

        // si falla intenta reconectar después de 5s
        setTimeout(conectarDB, 5000);

      }

    };

    module.exports = conectarDB;
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('🔴 ERROR: MONGODB_URI no está definida');
    process.exit(1);
  }

  try {

    console.log('📦 Intentando conectar a MongoDB...');

    await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      family: 4
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

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔴 Conexión MongoDB cerrada');
      process.exit(0);
    });

  } catch (error) {

    console.error('🔴 Error al conectar MongoDB:', error.message);
    process.exit(1);

  }

};

module.exports = conectarDB;