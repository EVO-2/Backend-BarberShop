const Usuario = require('../models/Usuario.model');


const emailExiste = async (correo = '') => {
  const existe = await Usuario.findOne({ correo });
  if (existe) {
    throw new Error(`El correo ${correo} ya está registrado`);
  }
};

module.exports = {
  emailExiste
};
