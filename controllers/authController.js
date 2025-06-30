const { loginService } = require('../services/authService');

// Validación sencilla de correo electrónico
const esCorreoValido = (correo) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(correo);
};

const loginController = async (req, res) => {
  //console.log('REQ BODY:', req.body); 

  const { correo, password } = req.body || {};

  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son requeridos' });
  }

  try {
    const result = await loginService(correo, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ mensaje: error.message || 'Error en el login' });

  }
};

module.exports = { loginController };
