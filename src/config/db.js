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
    await inicializarSuperAdmin();

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

const inicializarSuperAdmin = async () => {
  try {
    const Rol = require('../models/Rol.model');
    const Usuario = require('../models/Usuario.model');

    // 1. Buscar o crear el rol 'superadmin' (global, sin empresaId)
    let rolSuperAdmin = await Rol.findOne({ nombre: 'superadmin', empresaId: null });
    if (!rolSuperAdmin) {
      console.log('🌱 Creando rol global de superadmin...');
      rolSuperAdmin = new Rol({
        nombre: 'superadmin',
        descripcion: 'Rol de administración global de la plataforma SaaS',
        empresaId: null,
        permisos: []
      });
      await rolSuperAdmin.save();
      console.log('✅ Rol superadmin creado con éxito');
    }

    // 2. Buscar o crear el usuario superadmin (sin empresaId)
    const emailSuper = (process.env.SUPERADMIN_EMAIL || 'superadmin@jevo.com').toLowerCase().trim();
    let usuarioSuper = await Usuario.findOne({ correo: emailSuper }).setOptions({ bypassTenant: true });

    if (!usuarioSuper) {
      console.log(`🌱 Creando usuario superadmin por defecto: ${emailSuper}...`);
      
      const passSuper = process.env.SUPERADMIN_PASSWORD || 'SuperAdminJevo2026!';
      
      usuarioSuper = new Usuario({
        nombre: 'Plataforma SuperAdmin',
        correo: emailSuper,
        password: passSuper, // se encripta automáticamente en el pre-save del modelo
        rol: rolSuperAdmin._id,
        empresaId: null,
        estado: true
      });

      await usuarioSuper.save();
      console.log('✅ Usuario superadmin creado con éxito');
    }
  } catch (err) {
    console.error('❌ Error al inicializar el SuperAdmin:', err);
  }
};

module.exports = conectarDB;