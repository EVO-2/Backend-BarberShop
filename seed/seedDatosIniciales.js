// seed/seedDatosIniciales.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Usuario   = require('../src/models/Usuario.model');
const Cliente   = require('../src/models/Cliente.model');
const Peluquero = require('../src/models/Peluquero.model');
const Servicio  = require('../src/models/Servicio.model');
const Rol       = require('../src/models/Rol.model');

const seedDatos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🟢 Conectado a MongoDB');

    // 1. Crear roles si no existen
    const rolAdmin = await Rol.findOneAndUpdate(
      { nombre: 'admin' },
      { $setOnInsert: { descripcion: 'Administrador', estado: true } },
      { new: true, upsert: true }
    );
    const rolCliente = await Rol.findOneAndUpdate(
      { nombre: 'cliente' },
      { $setOnInsert: { descripcion: 'Cliente que agenda citas', estado: true } },
      { new: true, upsert: true }
    );
    const rolBarbero = await Rol.findOneAndUpdate(
      { nombre: 'barbero' },
      { $setOnInsert: { descripcion: 'Empleado que atiende citas', estado: true } },
      { new: true, upsert: true }
    );

    if (!rolAdmin || !rolCliente || !rolBarbero) {
      throw new Error('❌ No se pudieron crear los roles correctamente');
    }

    // 2. Limpia colecciones dependientes (opcional)
    await Promise.all([
      Usuario.deleteMany({}),
      Cliente.deleteMany({}),
      Peluquero.deleteMany({}),
      Servicio.deleteMany({})
    ]);
    console.log('🧹 Colecciones limpiadas');

    // 3. Crear usuario administrador
    await Usuario.create({
      nombre: 'Edward Admin',
      correo: 'admin@barberia.com',
      password: bcrypt.hashSync('admin123', 10),
      rol: rolAdmin._id,
      estado: true
    });
    console.log('✅ Admin creado');

    // 4. Crear clientes
    for (let i = 1; i <= 3; i++) {
      const u = await Usuario.create({
        nombre: `Cliente${i}`,
        correo: `cliente${i}@correo.com`,
        password: bcrypt.hashSync('cliente123', 10),
        rol: rolCliente._id,
        estado: true
      });
      await Cliente.create({ usuario: u._id });
    }
    console.log('✅ 3 Clientes creados');

    // 5. Crear barberos
    for (let i = 1; i <= 3; i++) {
      const u = await Usuario.create({
        nombre: `Peluquero${i}`,
        correo: `peluquero${i}@correo.com`,
        password: bcrypt.hashSync('peluquero123', 10),
        rol: rolBarbero._id,
        estado: true
      });
      await Peluquero.create({ usuario: u._id });
    }
    console.log('✅ 3 Peluqueros creados');

    // 6. Crear servicios
    await Servicio.insertMany([
      { nombre: 'Corte de cabello', precio: 15000, duracion: 30 },
      { nombre: 'Barba', precio: 8000, duracion: 15 },
      { nombre: 'Corte + Barba', precio: 20000, duracion: 45 }
    ]);
    console.log('✅ Servicios creados');

  } catch (error) {
    console.error('❌ Error insertando datos:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
};

seedDatos();
