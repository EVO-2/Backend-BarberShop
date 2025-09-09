const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario.model');

const validarJWT = async (req, res, next) => {
  const authHeader = req.header('Authorization') || req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      mensaje: 'Token no proporcionado o formato incorrecto',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verificamos que el token traiga uid
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);

    // Buscamos el usuario y populamos el rol
    const usuario = await Usuario.findById(uid).populate('rol');
    if (!usuario) {
      return res.status(401).json({
        mensaje: 'Token no válido – usuario no existe',
      });
    }

    // Guardamos info en el request
    req.usuario = usuario;
    req.uid = uid;
    req.usuarioId = usuario._id;

    // Normalizamos el rol
    req.rol = (usuario.rol?.nombre || usuario.rol?.toString() || '').toLowerCase();

    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token no válido',
      error: error.message,
    });
  }
};

module.exports = { validarJWT };
