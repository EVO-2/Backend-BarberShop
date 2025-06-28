const { Usuario } = require('../models');
const bcrypt = require('bcryptjs');

const obtenerTodos = async () => {
  return await Usuario.findAll();
};

const obtenerPorId = async (id) => {
  return await Usuario.findByPk(id);
};

const crear = async (data) => {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return await Usuario.create({ ...data, password: hashedPassword });
};

const actualizar = async (id, data) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('Usuario no encontrado');

  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }

  return await usuario.update(data);
};

const eliminar = async (id) => {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) throw new Error('Usuario no encontrado');

  await usuario.destroy();
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
