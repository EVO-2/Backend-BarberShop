const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  const traceId = `LOGIN-${Date.now()}`;

  try {
    const { correo, password } = req.body;

    console.log(`🟢 [${traceId}] Inicio login`, { correo });

    const usuario = await Usuario.findOne({ correo })
      .select('+password')
      .populate('cliente')
      .populate({
        path: 'rol',
        select: 'nombre',
        populate: {
          path: 'permisos',
          select: 'nombre modulo'
        }
      });

    console.log(`🔍 [${traceId}] Usuario encontrado:`, usuario?._id);

    if (!usuario || !usuario.estado) {
      console.warn(`⚠️ [${traceId}] Usuario no válido o inactivo`);
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, usuario.password);

    if (!validPassword) {
      console.warn(`⚠️ [${traceId}] Contraseña incorrecta`);
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    console.log(`🔐 [${traceId}] Password correcto`);

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

    let datosRol = null;

    // ================= CLIENTE =================
    if (usuario.rol?.nombre === 'cliente') {

      console.log(`👤 [${traceId}] Cliente detectado`);

      // 🔥 USAR RELACIÓN DIRECTA (CORRECTO SEGÚN TU MODELO)
      if (usuario.cliente) {

        datosRol = await Cliente.findById(usuario.cliente);

        if (datosRol) {
          console.log(`✅ [${traceId}] Cliente obtenido por ID directo:`, datosRol._id);
        } else {
          console.error(`🚨 [${traceId}] Cliente no encontrado en BD`, usuario.cliente);
        }

      } else {

        console.error(`🚨 [${traceId}] Usuario cliente SIN relación cliente en usuario`, usuario._id);
      }
    }

    // ================= PELUQUERO =================
    else if (
      usuario.rol?.nombre === 'barbero' ||
      usuario.rol?.nombre === 'manicurista'
    ) {

      console.log(`✂️ [${traceId}] Usuario con rol PELUQUERO`);

      datosRol = await Peluquero.findOne({ usuario: usuario._id });

      if (!datosRol) {
        console.error(`🚨 [${traceId}] Peluquero no encontrado`, usuario._id);
      } else {
        console.log(`✅ [${traceId}] Peluquero encontrado`, datosRol._id);
      }
    }

    // ================= RESPUESTA =================
    const response = {
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol?.nombre,
        foto: usuario.foto,

        permisos: usuario.rol?.permisos?.map(p => p.nombre) || [],

        // 🔥 GARANTÍA FINAL
        cliente:
          usuario.rol?.nombre === 'cliente'
            ? (usuario.cliente ? usuario.cliente.toString() : null)
            : undefined,

        peluquero:
          usuario.rol?.nombre === 'barbero' ||
            usuario.rol?.nombre === 'manicurista'
            ? datosRol
            : undefined
      },
      token,
      expiraEn: expDate
    };

    console.log(`📤 [${traceId}] Response enviado`, {
      usuarioId: response.usuario.id,
      rol: response.usuario.rol,
      cliente: response.usuario.cliente?._id || response.usuario.cliente || null,
      peluquero: response.usuario.peluquero?._id || null
    });

    res.json(response);

  } catch (error) {
    console.error(`💥 Error en login`, {
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      mensaje: 'Error al iniciar sesión'
    });
  }
};

const registro = async (req, res) => {
  const traceId = `REG-${Date.now()}`; // 🔥 ID único por request

  try {
    console.log(`🟢 [${traceId}] Inicio registro`);
    console.log(`📥 [${traceId}] Body recibido:`, {
      nombre: req.body?.nombre,
      correo: req.body?.correo
    });

    const { nombre, correo, password } = req.body;

    // 🔹 VALIDACIÓN CAMPOS
    if (!nombre || !correo || !password) {
      console.warn(`⚠️ [${traceId}] Campos incompletos`);
      return res.status(400).json({
        mensaje: 'Nombre, correo y contraseña son obligatorios'
      });
    }

    // 🔹 VALIDACIÓN CONTRASEÑA
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      console.warn(`⚠️ [${traceId}] Password no cumple política`);
      return res.status(400).json({
        mensaje:
          'La contraseña debe tener mínimo 8 caracteres, incluyendo mayúscula, minúscula, número y un carácter especial'
      });
    }

    // 🔹 VALIDAR USUARIO EXISTENTE
    const usuarioExistente = await Usuario.findOne({ correo });

    if (usuarioExistente) {
      console.warn(`⚠️ [${traceId}] Usuario ya existe`, {
        usuarioId: usuarioExistente._id
      });
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    console.log(`✅ [${traceId}] Correo disponible`);

    // 🔹 OBTENER ROL CLIENTE
    const rolNombre = 'cliente';
    const rolCliente = await Rol.findOne({ nombre: rolNombre.toLowerCase() });

    if (!rolCliente) {
      console.error(`❌ [${traceId}] Rol cliente NO encontrado`);
      return res.status(500).json({ mensaje: 'No se encontró el rol cliente' });
    }

    console.log(`✅ [${traceId}] Rol encontrado`, {
      rolId: rolCliente._id,
      rolNombre: rolCliente.nombre
    });

    // 🔹 CREAR USUARIO
    const nuevoUsuario = new Usuario({
      nombre,
      correo,
      password,
      rol: rolCliente._id
    });

    await nuevoUsuario.save();

    console.log(`✅ [${traceId}] Usuario creado`, {
      userId: nuevoUsuario._id
    });

    // 🔥 CREAR CLIENTE (con manejo de error)
    let cliente;

    try {
      cliente = await Cliente.create({
        usuario: nuevoUsuario._id
      });

      console.log(`✅ [${traceId}] Cliente creado:`, cliente._id);

    } catch (error) {
      console.error(`💥 [${traceId}] Error creando cliente:`, error.message);
      throw new Error('Fallo al crear cliente');
    }

    // 🔥 VINCULAR CLIENTE AL USUARIO (FORZADO + VERIFICACIÓN)
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      nuevoUsuario._id,
      { cliente: cliente._id },
      { new: true }
    );

    console.log(`🔗 [${traceId}] Usuario actualizado:`, usuarioActualizado?.cliente);

    // 🚨 VALIDACIÓN CRÍTICA
    if (!usuarioActualizado || !usuarioActualizado.cliente) {
      console.error(`🚨 [${traceId}] ERROR CRÍTICO: cliente NO se guardó en usuario`);
      throw new Error('No se pudo vincular el cliente al usuario');
    }

    // 🔍 VERIFICACIÓN FINAL
    const verificacion = await Usuario.findById(nuevoUsuario._id).populate('cliente');

    console.log(`🧪 [${traceId}] Verificación post-guardado`, {
      clienteEnUsuario: verificacion?.cliente?._id || null
    });

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

    console.log(`🔐 [${traceId}] Token generado`);

    // 🔹 RESPUESTA FINAL
    res.status(201).json({
      usuario: {
        id: nuevoUsuario._id,
        nombre: nuevoUsuario.nombre,
        rol: rolCliente.nombre,
        foto: nuevoUsuario.foto,
        cliente // ✅ clave para frontend
      },
      token,
      expiraEn: new Date(exp * 1000)
    });

    console.log(`🟣 [${traceId}] Registro completado OK`);

  } catch (error) {
    console.error(`💥 [${traceId}] Error en registro`, {
      message: error.message,
      stack: error.stack
    });

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
