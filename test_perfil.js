const mongoose = require('mongoose');

const uri = "mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP";

const run = async () => {
  try {
    await mongoose.connect(uri);
    console.log('🟢 Conectado a MongoDB');

    // Cargar todos los modelos para que Mongoose registre sus esquemas
    const Rol = require('./src/models/Rol.model');
    const Empresa = require('./src/models/Empresa.model');
    const Cliente = require('./src/models/Cliente.model');
    const Peluquero = require('./src/models/Peluquero.model');
    const Sede = require('./src/models/Sede.model');
    const PuestoTrabajo = require('./src/models/PuestoTrabajo.model');
    const Usuario = require('./src/models/Usuario.model');

    const emailTest = 'edwardvalencia6218@hotmail.com';
    const usuarioPre = await Usuario.findOne({ correo: emailTest });
    if (!usuarioPre) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    // Ejecutar exactamente la misma consulta de obtenerPerfil
    const usuario = await Usuario.findById(usuarioPre._id)
      .populate('rol')
      .populate('empresaId')
      .populate({
        path: 'cliente',
        populate: { path: 'usuario' }
      })
      .populate({
        path: 'peluquero',
        populate: [
          { path: 'sede' },
          { path: 'puestoTrabajo' },
          { path: 'usuario' }
        ]
      });

    console.log('--- USUARIO COMPLETO ---');
    console.log(JSON.stringify(usuario, null, 2));

    const rolNombre = usuario.rol?.nombre?.toLowerCase();
    const empresaLogo = usuario.empresaId?.logo || 'assets/sede.png';
    const empresaNombre = usuario.empresaId?.nombre || 'Style Manager';

    console.log('--- RESULTADO DE LA RESPUESTA ---');
    console.log({
      tipo: 'admin',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol?.nombre,
        foto: usuario.foto,
        empresaLogo,
        empresaNombre,
        empresaId: usuario.empresaId
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado');
  }
};

run();
