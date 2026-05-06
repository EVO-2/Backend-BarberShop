const Empresa = require('../models/Empresa.model');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const jwt = require('jsonwebtoken');

// ============================================================
// 🚀 ONBOARDING SAAS: Registrar nueva barbería
// ============================================================
exports.registrarNuevaEmpresa = async (req, res) => {
  try {
    const { 
      // Datos del dueño
      nombreDueño, 
      correoDueño, 
      passwordDueño,
      
      // Datos del negocio
      nombreEmpresa, 
      telefonoEmpresa, 
      direccionEmpresa 
    } = req.body;

    // 1️⃣ Validar si el correo ya existe en todo el sistema
    const usuarioExiste = await Usuario.findOne({ correo: correoDueño.toLowerCase() });
    if (usuarioExiste) {
      return res.status(400).json({ ok: false, mensaje: 'El correo ya está registrado en el sistema.' });
    }

    // 2️⃣ Validar si el nombre de la empresa ya existe
    const empresaExiste = await Empresa.findOne({ nombre: nombreEmpresa.trim().toUpperCase() });
    if (empresaExiste) {
      return res.status(400).json({ ok: false, mensaje: 'El nombre de la empresa ya está en uso.' });
    }

    // 3️⃣ Buscar el Rol de Administrador Global
    const rolAdmin = await Rol.findOne({ nombre: 'admin' });
    if (!rolAdmin) {
      return res.status(500).json({ ok: false, mensaje: 'Error interno: Rol de administrador no encontrado.' });
    }

    // 4️⃣ Crear la nueva Empresa (Automáticamente le da 14 días de prueba por el modelo)
    const nuevaEmpresa = new Empresa({
      nombre: nombreEmpresa.trim().toUpperCase(),
      telefono: telefonoEmpresa,
      direccion: direccionEmpresa,
      email: correoDueño.toLowerCase()
    });
    
    await nuevaEmpresa.save();

    // 5️⃣ Crear el Usuario Dueño asignado a la nueva Empresa
    const nuevoUsuario = new Usuario({
      nombre: nombreDueño,
      correo: correoDueño.toLowerCase(),
      password: passwordDueño, // Mongoose pre-save lo encriptará
      rol: rolAdmin._id,
      empresaId: nuevaEmpresa._id
    });

    await nuevoUsuario.save();

    // 6️⃣ (Opcional) Generar JWT para que entren de inmediato
    const payload = {
      uid: nuevoUsuario._id,
      rol: 'admin',
      nombre: nuevoUsuario.nombre,
      foto: nuevoUsuario.foto || ''
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.status(201).json({
      ok: true,
      mensaje: '¡Empresa registrada con éxito! Tu periodo de prueba ha comenzado.',
      token,
      empresa: {
        id: nuevaEmpresa._id,
        nombre: nuevaEmpresa.nombre,
        suscripcionEstado: nuevaEmpresa.suscripcionEstado,
        fechaFinPrueba: nuevaEmpresa.fechaFinPrueba
      }
    });

  } catch (error) {
    console.error('❌ Error en registro SaaS:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al registrar la nueva empresa',
      error: error.message
    });
  }
};
