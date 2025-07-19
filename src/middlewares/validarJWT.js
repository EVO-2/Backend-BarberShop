const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');

const validarJWT = async (req, res, next) => {
  const authHeader =
    req.header('Authorization') || req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    //console.warn('🚫 Token no proporcionado o mal formado');
    return res
      .status(401)
      .json({ mensaje: 'Token no proporcionado o formato incorrecto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

    //console.log('🎫 Token verificado, UID:', uid);

    const usuario = await Usuario.findById(uid).populate('rol');
    if (!usuario) {
      console.warn('🚫 Usuario no encontrado con UID:', uid);
      return res
        .status(401)
        .json({ mensaje: 'Token no válido – usuario no existe' });
    }

    req.usuario = usuario;
    req.uid = uid;

    // Verificamos si el rol está correctamente populado y obtenemos su nombre
    req.rol = usuario.rol?.nombre || usuario.rol?.toString();

    // 🔍 Logs para depuración
    /*console.log('👤 Usuario autenticado:', usuario.nombre);
    console.log('🆔 Rol ID:', usuario.rol?._id);
    console.log('🔐 Nombre del Rol:', usuario.rol?.nombre);
    console.log('📌 Rol asignado a req.rol:', req.rol);*/

    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res
      .status(401)
      .json({ mensaje: 'Token no válido', error: error.message });
  }
};

module.exports = { validarJWT };
