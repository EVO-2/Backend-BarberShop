const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');

const validarJWT = async (req, res, next) => {
  const authHeader =
    req.header('Authorization') || req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ mensaje: 'Token no proporcionado o formato incorrecto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

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

    next();
  } catch (error) {
    console.error('❌ Error al verificar token:', error.message);
    return res
      .status(401)
      .json({ mensaje: 'Token no válido', error: error.message });
  }
};

module.exports = { validarJWT };
