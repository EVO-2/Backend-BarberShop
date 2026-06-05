const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');
const { tenantStorage } = require('../plugins/tenant');

// ===============================
// 🔐 VALIDAR JWT
// ===============================
const validarJWT = async (req, res, next) => {

  const authHeader = req.header('Authorization') || req.header('authorization');

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
      .setOptions({ bypassTenant: true })
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

    // ✅ ENVOLVER NEXT() EN EL CONTEXTO DEL TENANT Y VALIDAR SUSCRIPCIÓN
    const { validarSuscripcion } = require('./validarSuscripcion');
    
    // 👑 Excepción para Súper Administrador: Acceso total sin validar suscripción ni forzar tenant
    const esSuperAdmin = req.rol === 'superadmin';

    if (usuario.empresaId && !esSuperAdmin) {
      return tenantStorage.run(usuario.empresaId, () => {
        return validarSuscripcion(req, res, next);
      });
    } else {
      return next(); // SuperAdmins o usuarios sin empresa aún
    }

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