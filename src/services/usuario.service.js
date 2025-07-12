const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario.model');


const crearUsuario = async (datos) => {
  // Validar si el correo ya está registrado
  const existe = await Usuario.findOne({ correo: datos.correo });
  if (existe) {
    throw new Error('El correo ya está registrado');
  }

  // Encriptar la contraseña antes de guardar
  const salt = bcrypt.genSaltSync(10);
  datos.password = bcrypt.hashSync(datos.password, salt);

  const usuario = new Usuario(datos);
  return await usuario.save();
};

const obtenerUsuarios = async () => {
  return await Usuario.find();
};

const obtenerUsuarioPorId = async (id) => {
  return await Usuario.findById(id);
};

const actualizarUsuario = async (id, datos) => {
  if (datos.correo) {
    // Verifica si el nuevo correo ya existe en otro usuario
    const existe = await Usuario.findOne({ correo: datos.correo, _id: { $ne: id } });
    if (existe) {
      throw new Error('El correo ya está en uso por otro usuario');
    }
  }

  return await Usuario.findByIdAndUpdate(id, datos, { new: true });
};

const eliminarUsuario = async (id) => {
  return await Usuario.findByIdAndUpdate(id, { estado: false }, { new: true });
};

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario
};
