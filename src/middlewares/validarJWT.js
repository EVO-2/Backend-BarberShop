const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {
  const authHeader = req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token no proporcionado o formato incorrecto' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { uid, rol } = jwt.verify(token, process.env.JWT_SECRET);
    req.uid = uid;
    req.rol = rol;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token no válido', error: error.message });
  }
};

module.exports = validarJWT;
