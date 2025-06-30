const bcrypt = require('bcryptjs'); // usa bcryptjs si no estás usando 'bcrypt'
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const loginService = async (correo, password) => {
  //console.log('➡️ Buscando usuario:', correo);
  const user = await Usuario.findOne({ where: { correo, estado: true } });
 if (!user) {
  //console.log('❌ Usuario no encontrado');
  throw new Error('El correo no está registrado');
}
//console.log('✅ Usuario encontrado:', user.nombre);

if (!user.estado) {
  throw new Error('El usuario está inactivo');
}

  const validPassword = await bcrypt.compare(password, user.password);
  //console.log('❌ Contraseña incorrecta');
  if (!validPassword) throw new Error('Contraseña incorrecta');

  const token = jwt.sign(
    { id: user.id, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );

  return { token, user: { id: user.id, nombre: user.nombre, rol: user.rol } };
};

module.exports = { loginService }; 
