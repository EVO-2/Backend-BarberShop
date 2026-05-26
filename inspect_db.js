const mongoose = require('mongoose');

const uri = "mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP";

const run = async () => {
  try {
    await mongoose.connect(uri);
    console.log('🟢 Conectado a MongoDB');

    // Cargar todos los modelos para que Mongoose registre sus esquemas
    const Rol = require('./src/models/Rol.model');
    const Usuario = require('./src/models/Usuario.model');
    const Empresa = require('./src/models/Empresa.model');

    const emailTest = 'edwardvalencia6218@hotmail.com';
    // Buscar usuario de forma directa
    const usuario = await Usuario.findOne({ correo: emailTest }).populate('rol');
    if (!usuario) {
      console.log(`❌ No se encontró el usuario ${emailTest}`);
      
      const admins = await Usuario.find().populate('rol');
      console.log('Administradores disponibles:', admins.map(a => ({ nombre: a.nombre, correo: a.correo, rol: a.rol?.nombre, empresaId: a.empresaId })));
      mongoose.disconnect();
      return;
    }

    console.log(`👤 Usuario encontrado: ${usuario.nombre} (${usuario.correo})`);
    console.log(`💼 Empresa actual: ${usuario.empresaId}`);

    let empresa = await Empresa.findOne();
    if (!empresa) {
      console.log('🌱 No hay empresas en la DB. Creando una nueva empresa de pruebas...');
      empresa = new Empresa({
        nombre: 'Edward BarberShop',
        nit: '123456789',
        direccion: 'Calle Falsa 123',
        telefono: '3001234567',
        email: emailTest,
        plan: 'trial',
        suscripcionEstado: 'trial'
      });
      await empresa.save();
      console.log(`✅ Empresa creada con ID: ${empresa._id}`);
    } else {
      console.log(`🏢 Empresa encontrada en DB: ${empresa.nombre} (ID: ${empresa._id})`);
    }

    if (!usuario.empresaId || usuario.empresaId.toString() !== empresa._id.toString()) {
      console.log(`🔗 Vinculando usuario ${usuario.correo} con la empresa ${empresa.nombre}...`);
      usuario.empresaId = empresa._id;
      await usuario.save();
      console.log('✅ Usuario vinculado con éxito');
    } else {
      console.log('⭐ El usuario ya está vinculado a esta empresa.');
    }

    const todos = await Usuario.find({ correo: emailTest });
    console.log('Estado final del usuario:', todos.map(u => ({ nombre: u.nombre, correo: u.correo, empresaId: u.empresaId })));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
  }
};

run();
