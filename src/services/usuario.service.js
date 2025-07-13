const bcrypt  = require('bcryptjs');
const Usuario = require('../models/Usuario.model');
const Rol     = require('../models/Rol.model');   // ⬅️  nuevo import

/* ========================== */
/*    Crear usuario           */
/* ========================== */
const crearUsuario = async (datos) => {
  // 1. Validar correo duplicado
  const existe = await Usuario.findOne({ correo: datos.correo });
  if (existe) throw new Error('El correo ya está registrado');

  // 2. Buscar el rol por nombre (ej. 'barbero', 'cliente')
  const rolDoc = await Rol.findOne({ nombre: datos.rol });
  if (!rolDoc) throw new Error(`Rol '${datos.rol}' no existe`);

  // 3. Encriptar contraseña
  const salt = bcrypt.genSaltSync(10);
  datos.password = bcrypt.hashSync(datos.password, salt);

  // 4. Reemplazar string 'rol' por su ObjectId
  const usuario = new Usuario({
    ...datos,
    rol: rolDoc._id
  });

  return await usuario.save();
};

/* ========================== */
/*        Otros métodos       */
/* ========================== */

const obtenerUsuarios = async () => {
  // populate opcional para devolver el nombre del rol
  return await Usuario.find().populate('rol', 'nombre');
};

const obtenerUsuarioPorId = async (id) => {
  return await Usuario.findById(id).populate('rol', 'nombre');
};

const actualizarUsuario = async (id, datos) => {
  // Validar correo duplicado si viene en la petición
  if (datos.correo) {
    const existe = await Usuario.findOne({ correo: datos.correo, _id: { $ne: id } });
    if (existe) throw new Error('El correo ya está en uso por otro usuario');
  }

  // Si quieren cambiar de rol, traducir nombre → ObjectId
  if (datos.rol) {
    const rolDoc = await Rol.findOne({ nombre: datos.rol });
    if (!rolDoc) throw new Error(`Rol '${datos.rol}' no existe`);
    datos.rol = rolDoc._id;
  }

  return await Usuario.findByIdAndUpdate(id, datos, { new: true }).populate('rol', 'nombre');
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
