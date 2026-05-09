const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const HistorialService = require('../services/historial.service');
const Empresa = require('../models/Empresa.model');

const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    // 1. Buscamos usuario con relaciones
    const usuario = await Usuario.findOne({ correo })
      .select('+password')
      .populate('cliente')
      .populate('empresaId')
      .populate({
        path: 'rol',
        select: 'nombre',
        populate: {
          path: 'permisos',
          select: 'nombre modulo'
        }
      });

    if (!usuario || !usuario.estado) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    // 2. Validar contraseña
    const validPassword = await bcrypt.compare(password, usuario.password);
    if (!validPassword) {
      HistorialService.registrarAccion({
        usuario: usuario._id,
        accion: 'INTENTO_FALLIDO',
        modulo: 'AUTENTICACION',
        descripcion: 'Contraseña incorrecta al iniciar sesión',
        ip: req.ip || req.connection.remoteAddress,
        dispositivo: req.headers['user-agent'],
        exito: false
      });
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    HistorialService.registrarAccion({
      usuario: usuario._id,
      accion: 'LOGIN',
      modulo: 'AUTENTICACION',
      descripcion: 'Inicio de sesión exitoso',
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent'],
      exito: true
    });

    // 3. Token
    const token = jwt.sign(
      {
        uid: usuario._id,
        rol: usuario.rol?.nombre,
        nombre: usuario.nombre,
        foto: usuario.foto
      },
      process.env.JWT_SECRET,
      { expiresIn: '3h' }
    );

    const { exp } = jwt.decode(token);
    const expDate = new Date(exp * 1000);

    // 4. Rol
    const nombreRol = usuario.rol?.nombre?.toLowerCase();
    let datosExtra = null;

    if (nombreRol === 'cliente') {
      datosExtra = usuario.cliente;
    } else if (nombreRol === 'barbero' || nombreRol === 'manicurista') {
      datosExtra = await Peluquero.findOne({ usuario: usuario._id });
    }

    /**
     * 🔥 FUNCIÓN CRÍTICA DE SERIALIZACIÓN
     * Garantiza que SIEMPRE salga un string válido de ObjectId
     */
    const toId = (data) => {
      if (!data) return null;

      // Si es ObjectId o documento Mongoose
      if (typeof data === 'object') {
        return (data._id || data.id)?.toString() || null;
      }

      // Si ya es string
      if (typeof data === 'string') {
        const match = data.match(/[0-9a-fA-F]{24}/);
        return match ? match[0] : null;
      }

      return null;
    };

    // 5. Construcción final LIMPIA
    const usuarioFinal = {
      _id: usuario._id.toString(),
      id: usuario._id.toString(),
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: nombreRol || 'cliente',
      foto: usuario.foto || '',
      permisos: usuario.rol?.permisos?.map(p => p.nombre) || [],

      cliente: nombreRol === 'cliente'
        ? toId(usuario.cliente || datosExtra)
        : undefined,

      peluquero: (nombreRol === 'barbero' || nombreRol === 'manicurista')
        ? toId(datosExtra)
        : undefined,
        
      empresaLogo: usuario.empresaId?.logo || 'assets/sede.png'
    };

    // 6. RESPUESTA
    res.status(200).json({
      usuario: usuarioFinal,
      token,
      expiraEn: expDate
    });

  } catch (error) {
    console.error(`Error en login:`, error);

    res.status(500).json({
      mensaje: 'Error al iniciar sesión'
    });
  }
};

const registro = async (req, res) => {
  try {
    const { nombre, correo, password } = req.body;

    // 🔹 VALIDACIÓN CAMPOS
    if (!nombre || !correo || !password) {
      return res.status(400).json({
        mensaje: 'Nombre, correo y contraseña son obligatorios'
      });
    }

    // 🔹 VALIDACIÓN CONTRASEÑA
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        mensaje:
          'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y un carácter especial'
      });
    }

    // 🔹 VALIDAR USUARIO EXISTENTE
    const usuarioExistente = await Usuario.findOne({ correo });

    if (usuarioExistente) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    // 🔹 OBTENER ROL CLIENTE
    const rolNombre = 'cliente';
    const rolCliente = await Rol.findOne({ nombre: rolNombre.toLowerCase() });

    if (!rolCliente) {
      return res.status(500).json({ mensaje: 'No se encontró el rol cliente' });
    }

    // 🔹 OBTENER EMPRESA POR DEFECTO
    const empresaPrincipal = await Empresa.findOne({ nombre: 'BARBERSHOP PRINCIPAL' });

    // 🔹 CREAR USUARIO
    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      password,
      rol: rolCliente._id,
      empresaId: empresaPrincipal ? empresaPrincipal._id : null
    });

    await nuevoUsuario.save();

    // 🔥 CREAR CLIENTE (con manejo de error)
    let cliente;

    try {
      cliente = await Cliente.create({
        usuario: nuevoUsuario._id,
        empresaId: empresaPrincipal ? empresaPrincipal._id : null
      });
    } catch (error) {
      console.error(`Error creando cliente:`, error);
      throw new Error('Fallo al crear cliente');
    }

    // 🔥 VINCULAR CLIENTE AL USUARIO (FORZADO + VERIFICACIÓN)
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      nuevoUsuario._id,
      { cliente: cliente._id },
      { new: true }
    );

    // 🚨 VALIDACIÓN CRÍTICA
    if (!usuarioActualizado || !usuarioActualizado.cliente) {
      throw new Error('No se pudo vincular el cliente al usuario');
    }

    // 🔹 GENERAR TOKEN
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

    // 🔹 RESPUESTA FINAL
    res.status(201).json({
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        rol: rolCliente.nombre,
        foto: nuevoUsuario.foto,
        cliente, // ✅ clave para frontend
        empresaLogo: empresaPrincipal ? empresaPrincipal.logo : 'assets/sede.png'
      },
      token,
      expiraEn: new Date(exp * 1000)
    });

  } catch (error) {
    console.error(`Error en registro:`, error);

    res.status(500).json({
      mensaje: 'Error al registrar usuario'
    });
  }
};

const verificarCorreoExistente = async (req, res) => {
  const { correo } = req.body;

  try {
    const existe = await Usuario.findOne({ correo });
    res.json({ existe: !!existe });
  } catch (error) {
    console.error('Error al verificar correo:', error);
    res.status(500).json({
      mensaje: 'Error al verificar el correo'
    });
  }
};

module.exports = {
  login,
  registro,
  verificarCorreoExistente
};
