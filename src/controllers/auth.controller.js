const Usuario = require('../models/Usuario.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
  console.log('BODY recibido:', req.body);

  try {
    const usuario = await Usuario.findOne({ correo: req.body.correo }).select('+password');
    console.log('Usuario encontrado:', usuario);

    if (!usuario || !usuario.estado) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(req.body.password, usuario.password);
    console.log('¿Contraseña válida?', validPassword);

    if (!validPassword) {
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { uid: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ usuario, token });

  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
  }
};

module.exports = { login };
