const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');

const validarJWT = async (req, res, next) => {
  const authHeader = req.header('Authorization') || req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('⚠️ No se envió token o formato incorrecto:', authHeader);
    return res.status(401).json({
      mensaje: 'Token no proporcionado o formato incorrecto',
    });
  }

  const token = authHeader.split(' ')[1];
  console.log('📌 Token recibido:', token);

  try {
    // Verificamos que el token traiga uid
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ UID decodificado del token:', uid);

    // Buscamos el usuario y populamos el rol
    const usuario = await Usuario.findById(uid).populate('rol');
    if (!usuario) {
      console.warn('🚫 Usuario no encontrado con UID:', uid);
      return res.status(401).json({
        mensaje: 'Token no válido – usuario no existe',
      });
    }

    console.log('👤 Usuario encontrado:', {
      id: usuario._id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,   // aquí puede salir objeto o string
    });

    // Guardamos info en el request
    req.usuario = usuario;                 
    req.uid = uid;                         
    req.usuarioId = usuario._id;           

    // Normalizamos el rol
    req.rol = (usuario.rol?.nombre || usuario.rol?.toString() || '').toLowerCase();
    console.log('🎭 Rol normalizado y guardado en req.rol:', req.rol);

    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res.status(401).json({
      mensaje: 'Token no válido',
      error: error.message,
    });
  }
};

module.exports = { validarJWT };
