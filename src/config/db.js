// db.js
const mongoose = require('mongoose');
require('dotenv').config({ override: true });

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

    // Auto-seed de planes si es necesario
    await inicializarPlanes();

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

const inicializarPlanes = async () => {
  try {
    const PlanSuscripcion = require('../models/PlanSuscripcion.model');
    const count = await PlanSuscripcion.countDocuments();
    if (count === 0) {
      console.log('🌱 Inicializando planes de suscripción por defecto en MongoDB...');
      await PlanSuscripcion.insertMany([
        {
          nombre: 'TRIAL',
          descripcion: 'Prueba gratuita de 14 días con límite de 3 profesionales.',
          precioMensual: 0,
          caracteristicas: { maxPeluqueros: 3, maxSucursales: 1, incluyeBotWhatsApp: false }
        },
        {
          nombre: 'BASICO',
          descripcion: 'Ideal para barberías pequeñas.',
          precioMensual: 45000,
          caracteristicas: { maxPeluqueros: 3, maxSucursales: 1, incluyeBotWhatsApp: false }
        },
        {
          nombre: 'PRO',
          descripcion: 'Para barberías en crecimiento.',
          precioMensual: 89000,
          caracteristicas: { maxPeluqueros: 10, maxSucursales: 3, incluyeBotWhatsApp: false }
        },
        {
          nombre: 'PREMIUM',
          descripcion: 'El paquete completo con automatización.',
          precioMensual: 150000,
          caracteristicas: { maxPeluqueros: 999, maxSucursales: 999, incluyeBotWhatsApp: true }
        }
      ]);
      console.log('✅ Planes de suscripción inicializados con éxito');
    }
  } catch (err) {
    console.error('❌ Error al inicializar los planes de suscripción:', err);
  }
};

module.exports = conectarDB;