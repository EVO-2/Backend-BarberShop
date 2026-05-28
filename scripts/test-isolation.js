const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Empresa = require('../src/models/Empresa.model');
const Usuario = require('../src/models/Usuario.model');
const Rol = require('../src/models/Rol.model');
const Peluquero = require('../src/models/Peluquero.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('📦 Conectado a MongoDB para la prueba de aislamiento');

    // 1. Crear la segunda Empresa
    let empresaVip = await Empresa.findOne({ nombre: 'PELUQUERIA VIP' });
    if (!empresaVip) {
      empresaVip = await Empresa.create({
        nombre: 'PELUQUERIA VIP',
        direccion: 'Calle Falsa 123',
        telefono: '555-VIP',
        email: 'contacto@vip.com'
      });
      console.log('🏢 Empresa 2 (PELUQUERIA VIP) creada exitosamente.');
    } else {
      console.log('🏢 Empresa 2 (PELUQUERIA VIP) ya existía.');
    }

    // 2. Buscar el Rol "Barbero" o "Admin"
    let rolAdmin = await Rol.findOne({ nombre: 'admin' });
    if (!rolAdmin) {
      console.error('❌ No se encontró el rol admin en la base de datos.');
      process.exit(1);
    }

    // 3. Crear el Usuario Aislado
    const correoAislado = 'aislado@vip.com';
    let usuarioAislado = await Usuario.findOne({ correo: correoAislado });
    
    if (!usuarioAislado) {
      usuarioAislado = new Usuario({
        nombre: 'Administrador VIP',
        correo: correoAislado,
        password: 'admin123', // El pre-save hook de mongoose lo encriptará
        rol: rolAdmin._id,
        empresaId: empresaVip._id,
        estado: true
      });
      await usuarioAislado.save();
      console.log('👤 Usuario "aislado@vip.com" creado y asignado a PELUQUERIA VIP.');
    } else {
      console.log('👤 Usuario "aislado@vip.com" ya existía.');
    }

    console.log('✅ Prueba de aislamiento configurada con éxito.');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    mongoose.disconnect();
  });
