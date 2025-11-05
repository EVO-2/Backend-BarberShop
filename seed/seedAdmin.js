// seedAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Usuario = require('../src/models/Usuario.model');

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('📦 Conectado a MongoDB');

    const correo = 'admin@barberia.com';

    const existe = await Usuario.findOne({ correo }).select('+password');
    if (existe) {
      console.log('ℹ️ El usuario admin ya existe');
    } else {
      await Usuario.create({
      nombre: 'Edward',
      correo: 'edward@gmail.com',
      password: 'admin123', // el modelo se encarga de hashearla
      rol: 'admin',
      estado: true
     });

      console.log('✅ Usuario admin creado con éxito');
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    mongoose.disconnect();
  });
