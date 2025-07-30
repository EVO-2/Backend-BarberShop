const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const login = async (req, res) => {
  try {
    console.log('🔐 Login payload:', req.body); // Muestra lo que llega desde Angular
    const usuario = await Usuario.findOne({ correo: req.body.correo })
      .select('+password')
      .populate('rol', 'nombre');

    if (!usuario || !usuario.estado) {
      console.log('❌ Usuario no encontrado o inactivo');
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(req.body.password, usuario.password);
    console.log('🔑 Contraseña enviada:', req.body.password);
    console.log('🔒 Contraseña hash:', usuario.password);
    console.log('✅ ¿Contraseña válida?', validPassword);
    if (!validPassword) {
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    const rolNombre = usuario.rol?.nombre;

    const token = jwt.sign(
      {
        uid: usuario._id,
        rol: rolNombre,
        nombre: usuario.nombre,
        foto: usuario.foto
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { exp } = jwt.decode(token);
    const expDate = new Date(exp * 1000);

    res.json({
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        rol: rolNombre,
        foto: usuario.foto
      },
      token,
      expiraEn: expDate
    });

  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
  }
};

const registro = async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ mensaje: 'Nombre, correo y contraseña son obligatorios' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        mensaje: 'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y un carácter especial'
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

    // ⚠️ No hashees manualmente la contraseña
    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      password, // 🔐 Será hasheada automáticamente por el middleware pre('save')
      rol: rolCliente._id
    });

    await nuevoUsuario.save();

    const nuevoCliente = new Cliente({ usuario: nuevoUsuario._id });
    await nuevoCliente.save();

    const token = jwt.sign(
      {
        uid: nuevoUsuario._id,
        rol: rolCliente.nombre,
        nombre: nuevoUsuario.nombre,
        foto: nuevoUsuario.foto
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
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
    console.error('❌ Error al registrar usuario:', error);
    res.status(500).json({ mensaje: 'Error al registrar usuario', error: error.message });
  }
};


// GET /api/auth/perfil
const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.uid).select('-password').populate('rol');

    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    const rolNombre = usuario.rol?.nombre;
    let datosRol = null;

    if (rolNombre === 'cliente') {
      datosRol = await Cliente.findOne({ usuario: usuario._id });
    } else if (rolNombre === 'peluquero') {
      datosRol = await Peluquero.findOne({ usuario: usuario._id });
    }

    return res.json({ usuario, datosRol });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener perfil', error });
  }
};

// PUT /api/auth/perfil
const actualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const usuario = await Usuario.findByPk(usuarioId, {
      include: ['cliente', 'peluquero']
    });

    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    // Actualizar datos comunes
    const { nombre, password } = req.body;
    if (nombre) usuario.nombre = nombre;
    if (password) usuario.password = await Usuario.hashPassword(password);

    // Foto
    if (req.file) {
      usuario.foto = req.file.filename;
    }

    await usuario.save();

    // Actualizar datos específicos por rol
    const rol = usuario.rol;

    if (rol === 'cliente') {
      const { telefono, direccion } = req.body;
      if (usuario.cliente) {
        if (telefono) usuario.cliente.telefono = telefono;
        if (direccion) usuario.cliente.direccion = direccion;
        await usuario.cliente.save();
      }
    }

    if (rol === 'peluquero') {
      const { especialidades, telefono, bio } = req.body;
      if (usuario.peluquero) {
        if (especialidades) usuario.peluquero.especialidades = especialidades;
        if (telefono) usuario.peluquero.telefono = telefono;
        if (bio) usuario.peluquero.bio = bio;
        await usuario.peluquero.save();
      }
    }

    res.json({
      msg: 'Perfil actualizado correctamente',
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        foto: usuario.foto,
        rol: usuario.rol,
        ...(usuario.cliente && { cliente: usuario.cliente }),
        ...(usuario.peluquero && { peluquero: usuario.peluquero })
      }
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ msg: 'Error interno al actualizar perfil' });
  }
};

// GET /api/auth/peluquero
const obtenerPerfilPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findOne({ usuario: req.uid })
      .populate('usuario', 'nombre correo foto')
      .populate('sede', 'nombre direccion')
      .populate('puestoTrabajo', 'nombre');

    if (!peluquero) {
      return res.status(404).json({ mensaje: 'Perfil de peluquero no encontrado' });
    }

    res.json({ peluquero });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener perfil de peluquero' });
  }
};

// PUT /api/auth/peluquero
const actualizarPerfilPeluquero = async (req, res) => {
  try {
    const usuarioId = req.uid;
    const {
      especialidades,
      experiencia,
      direccion,
      telefono_profesional,
      sede,
      puestoTrabajo
    } = req.body;

    let peluquero = await Peluquero.findOne({ usuario: usuarioId });

    if (!peluquero) {
      peluquero = new Peluquero({ usuario: usuarioId });
    }

    peluquero.especialidades = especialidades || peluquero.especialidades;
    peluquero.experiencia = experiencia ?? peluquero.experiencia;
    peluquero.direccion = direccion || peluquero.direccion;
    peluquero.telefono_profesional = telefono_profesional || peluquero.telefono_profesional;
    peluquero.sede = sede || peluquero.sede;
    peluquero.puestoTrabajo = puestoTrabajo || peluquero.puestoTrabajo;

    await peluquero.save();

    res.json({
      mensaje: 'Perfil de peluquero actualizado correctamente',
      peluquero
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar perfil de peluquero' });
  }
};

module.exports = {
  login,
  registro,
  obtenerPerfil,
  actualizarPerfil,
  obtenerPerfilPeluquero,
  actualizarPerfilPeluquero
};
