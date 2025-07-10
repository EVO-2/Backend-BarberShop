const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado' });
  }

  try {
    const { uid, rol } = jwt.verify(token, process.env.JWT_SECRET);
    req.uid = uid;
    req.rol = rol;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token no válido' });
  }
};

module.exports = validarJWT;
