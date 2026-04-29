const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');

// ===============================
// 🔐 VALIDAR JWT
// ===============================
const validarJWT = async (req, res, next) => {

  const authHeader = req.header('Authorization') || req.header('authorization');
  console.log(`[validarJWT] Path: ${req.originalUrl}, AuthHeader: ${authHeader}`);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log(`[validarJWT] 401 - Header missing or bad format`);
    return res.status(401).json({
      mensaje: 'Token no proporcionado o formato incorrecto',
    });
  }

  const token = authHeader.split(' ')[1];

  try {

    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 POPULATE PRO (ROL + PERMISOS CON NOMBRE Y MODULO)
    const usuario = await Usuario.findById(uid)
      .populate({
        path: 'rol',
        select: 'nombre permisos',
        populate: {
          path: 'permisos',
          select: 'nombre modulo'
        }
      });

    if (!usuario) {
      return res.status(401).json({
        mensaje: 'Token no válido – usuario no existe'
      });
    }

    // ===============================
    // ✅ DATA BASE
    // ===============================
    req.usuario = usuario;
    req.uid = uid;
    req.usuarioId = usuario._id;

    // ✅ NORMALIZAR ROL (CLAVE 🔥)
    req.rol = String(
      usuario.rol?.nombre || usuario.rol || ''
    ).toLowerCase();

    // ✅ PERMISOS (AHORA SÍ 100% FUNCIONAL)
    req.permisos = (usuario.rol?.permisos || []).map(p => p.nombre);

    next();

  } catch (error) {
    console.log(`[validarJWT] 401 - Token no válido. Error:`, error.message);
    return res.status(401).json({
      mensaje: 'Token no válido',
      error: error.message,
    });

  }
};

// ===============================
// 🔐 VERIFICAR ROL
// ===============================
const verificarRol = (...rolesPermitidos) => {

  return (req, res, next) => {

    if (!req.rol) {
      return res.status(500).json({
        mensaje: 'El rol no está definido en el request'
      });
    }

    const roles = rolesPermitidos.map(r => r.toLowerCase());

    if (!roles.includes(req.rol)) {
      return res.status(403).json({
        mensaje: `Acceso denegado. Rol '${req.rol}' no autorizado`
      });
    }

    next();
  };
};

module.exports = {
  validarJWT,
  verificarRol
};