const bcrypt = require('bcryptjs'); // usa bcryptjs si no estás usando 'bcrypt'
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const loginService = async (correo, password) => {
  const user = await Usuario.findOne({ where: { correo, estado: true } });
  if (!user) throw new Error('Usuario no encontrado o inactivo');

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) throw new Error('Contraseña incorrecta');

  const token = jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  return { token, user: { id: user.id, nombre: user.nombre, rol: user.rol } };
};

module.exports = { loginService }; // 👈 así debe exportarse
