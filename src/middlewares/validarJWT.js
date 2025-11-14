import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.model.js';

export const validarJWT = async (req, res, next) => {
  const authHeader = req.header('Authorization') || req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      mensaje: 'Token no proporcionado o formato incorrecto',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(uid).populate('rol');

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Token no válido – usuario no existe' });
    }

    req.usuario = usuario;
    req.uid = uid;
    req.usuarioId = usuario._id;
    req.rol = (usuario.rol?.nombre || usuario.rol?.toString() || '').toLowerCase();

    next();
  } catch (error) {
    return res.status(401).json({
      mensaje: 'Token no válido',
      error: error.message,
    });
  }
};

// Opcional: verificación de roles
export const verificarRol = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!rolesPermitidos.includes(req.rol)) {
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }
    next();
  };
};
