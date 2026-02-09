const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    // 🔍 LOGS DE DEPURACIÓN (CLAVE PARA CAPACITOR / ANDROID)
    console.log('📱 USER-AGENT:', req.headers['user-agent']);
    console.log('📥 Body recibido:', req.body);

    const usuario = await Usuario.findOne({ correo: req.body.correo })
      .select('+password')
      .populate('rol', 'nombre');

    if (!usuario || !usuario.estado) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(req.body.password, usuario.password);
    if (!validPassword) {
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        uid: usuario._id,
        rol: usuario.rol?.nombre,
        nombre: usuario.nombre,
        foto: usuario.foto
      },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    const { exp } = jwt.decode(token);
    const expDate = new Date(exp * 1000);

    // 👇 Cargar datos extra según el rol
    let datosRol = null;

    if (usuario.rol?.nombre === 'cliente') {
      datosRol = await Cliente.findOne({ usuario: usuario._id });
    } else if (usuario.rol?.nombre === 'barbero') {
      datosRol = await Peluquero.findOne({ usuario: usuario._id });
    }

    res.json({
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol?.nombre,
        foto: usuario.foto,
        cliente: usuario.rol?.nombre === 'cliente' ? datosRol : undefined,
        peluquero: usuario.rol?.nombre === 'barbero' ? datosRol : undefined
      },
      token,
      expiraEn: expDate
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({
      mensaje: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

const registro = async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({
        mensaje: 'Nombre, correo y contraseña son obligatorios'
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        mensaje:
          'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y un carácter especial'
      });
    }

    const usuarioExistente = await Usuario.findOne({ correo });
    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    const rolCliente = await Rol.findOne({ nombre: 'cliente' });
    if (!rolCliente) {
      return res.status(500).json({ mensaje: 'No se encontró el rol cliente' });
    }

    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      password,
      rol: rolCliente._id
    });

    await nuevoUsuario.save();
    await Cliente.create({ usuario: nuevoUsuario._id });

    const token = jwt.sign(
      {
        uid: nuevoUsuario._id,
        rol: rolCliente.nombre,
        nombre: nuevoUsuario.nombre,
        foto: nuevoUsuario.foto
      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    const { exp } = jwt.decode(token);

    res.status(201).json({
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        rol: rolCliente.nombre,
        foto: nuevoUsuario.foto
      },
      token,
      expiraEn: new Date(exp * 1000)
    });

  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({
      mensaje: 'Error al registrar usuario',
      error: error.message
    });
  }
};

const verificarCorreoExistente = async (req, res) => {
  const { correo } = req.body;

  try {
    const existe = await Usuario.findOne({ correo });
    res.json({ existe: !!existe });
  } catch (error) {
    console.error('❌ Error al verificar correo:', error);
    res.status(500).json({
      mensaje: 'Error al verificar el correo',
      error: error.message
    });
  }
};

module.exports = {
  login,
  registro,
  verificarCorreoExistente
};
