const { loginService } = require('../services/authService');

const loginController = async (req, res) => {
  console.log('REQ BODY:', req.body); // <-- Aquí lo debes poner

  const { correo, password } = req.body || {};

  if (!correo || !password) {
    return res.status(400).json({ mensaje: 'Correo y contraseña son requeridos' });
  }

  try {
    const result = await loginService(correo, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ mensaje: error.message });
  }
};

module.exports = { loginController };
