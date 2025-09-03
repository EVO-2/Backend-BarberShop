const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  try {
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
      { expiresIn: '4h' }
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
    res.status(500).json({ mensaje: 'Error al registrar usuario', error: error.message });
  }
};

const verificarCorreoExistente = async (req, res) => {
  const { correo } = req.body;

  try {
    const existe = await Usuario.findOne({ correo });
    res.json({ existe: !!existe });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al verificar el correo', error: error.message });
  }
};

const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.uid)
      .select('-password')
      .populate('rol');

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    let datosRol = {};
    const rol = usuario.rol?.nombre;

    if (rol === 'cliente') {
      const cliente = await Cliente.findOne({ usuario: usuario._id }).populate('usuario');
      if (cliente) {
        datosRol = {
          telefono: cliente.telefono,
          direccion: cliente.direccion,
        };
      }
    } else if (rol === 'barbero') {
      const peluquero = await Peluquero.findOne({ usuario: usuario._id }).populate('usuario');
      if (peluquero) {
        datosRol = {
          especialidad: peluquero.especialidad,
          experiencia: peluquero.experiencia,
        };
      }
    }

    // respuesta consistente con login
    const usuarioConFormato = {
      uid: usuario._id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol?.nombre,
      foto: usuario.foto || null,
      ...datosRol,
    };

    return res.json({ ok: true, usuario: usuarioConFormato });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener perfil',
      error: error.message,
    });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    // Buscar usuario autenticado
    let usuario = await Usuario.findById(req.uid).populate('rol');
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const { nombre, password } = req.body;

    // Actualizar nombre
    if (nombre && nombre.trim() !== '') {
      usuario.nombre = nombre.trim();
    }

    // Actualizar contraseña con hash
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(password, salt);
    }

    // Actualizar foto si se envió
    if (req.file) {
      usuario.foto = req.file.filename;
    }

    await usuario.save();

    // Dependiendo del rol, actualizar datos específicos
    const rolNombre = usuario.rol?.nombre;

    if (rolNombre === 'cliente') {
      const { telefono, direccion } = req.body;
      let cliente = await Cliente.findOne({ usuario: usuario._id });

      if (cliente) {
        if (telefono) cliente.telefono = telefono;
        if (direccion) cliente.direccion = direccion;
        await cliente.save();
      }
    } else if (rolNombre === 'barbero') {
      const { especialidades, telefono_profesional, direccion_profesional } = req.body;
      let peluquero = await Peluquero.findOne({ usuario: usuario._id });

      if (peluquero) {
        if (especialidades) peluquero.especialidades = especialidades;
        if (telefono_profesional) peluquero.telefono_profesional = telefono_profesional;
        if (direccion_profesional) peluquero.direccion_profesional = direccion_profesional;
        await peluquero.save();
      }
    }

    // Volvemos a traer usuario actualizado con populate
    usuario = await Usuario.findById(req.uid).populate('rol');

    res.json({
      mensaje: 'Perfil actualizado correctamente',
      usuario
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ mensaje: 'Error al actualizar perfil', error: error.message });
  }
};


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
    res.status(500).json({ mensaje: 'Error al obtener perfil de peluquero', error: error.message });
  }
};

const actualizarPerfilPeluquero = async (req, res) => {
  try {
    const usuarioId = req.uid;
    const {
      especialidades,
      experiencia,
      direccion_profesional,
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
    peluquero.direccion_profesional = direccion_profesional || peluquero.direccion_profesional;
    peluquero.telefono_profesional = telefono_profesional || peluquero.telefono_profesional;
    peluquero.sede = sede || peluquero.sede;
    peluquero.puestoTrabajo = puestoTrabajo || peluquero.puestoTrabajo;

    await peluquero.save();

    res.json({ mensaje: 'Perfil de peluquero actualizado correctamente', peluquero });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar perfil de peluquero', error: error.message });
  }
};

module.exports = {
  login,
  registro,
  obtenerPerfil,
  actualizarPerfil,
  obtenerPerfilPeluquero,
  actualizarPerfilPeluquero,
  verificarCorreoExistente
};
