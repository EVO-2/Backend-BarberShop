const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

// ✅ Función reutilizable para cifrar contraseña
const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, 10);
};

// ✅ Verifica si ya existe un usuario con el correo dado
const obtenerPorCorreo = async (correo) => {
  return await Usuario.findOne({ where: { correo } });
};

// ✅ Lista todos los usuarios
const obtenerTodos = async () => {
  return await Usuario.findAll();
};

// ✅ Obtiene un usuario por ID
const obtenerPorId = async (id) => {
  return await Usuario.findByPk(id);
};

// ✅ Crea un nuevo usuario con la contraseña encriptada
const crear = async (data) => {
  const existente = await obtenerPorCorreo(data.correo);
  if (existente) {
    throw new Error('El correo ya está registrado');
  }

  const hashedPassword = await hashPassword(data.password);
  return await Usuario.create({
    ...data,
    password: hashedPassword,
    estado: true // Por defecto activo
  });
};

// ✅ Actualiza un usuario y encripta si viene nueva contraseña
const actualizar = async (id, data) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('Usuario no encontrado');

  if (data.password) {
    data.password = await hashPassword(data.password);
  }

  return await usuario.update(data);
};

// ✅ Elimina un usuario de forma permanente
const eliminar = async (id) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('Usuario no encontrado');

  await usuario.destroy();
};

// ✅ Desactiva (estado = false)
const desactivarUsuario = async (id) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('Usuario no encontrado');

  usuario.estado = false;
  await usuario.save();
  return usuario;
};

// ✅ Activa (estado = true)
const activarUsuario = async (id) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('Usuario no encontrado');

  usuario.estado = true;
  await usuario.save();
  return usuario;
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  obtenerPorCorreo,
  crear,
  actualizar,
  eliminar,
  activarUsuario,
  desactivarUsuario
};
