const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');

/* ========================== */
/*       Crear Usuario        */
/* ========================== */
const crearUsuario = async (datos) => {
  try {
    const { correo, password, rol } = datos;

    // Verificar correo duplicado
    const existe = await Usuario.findOne({ correo });
    if (existe) {
      throw new Error('El correo ya está registrado');
    }

    // Obtener documento del rol
    const rolDoc = await Rol.findOne({ nombre: rol });
    if (!rolDoc) {
      throw new Error(`El rol '${rol}' no existe`);
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crear usuario
    const nuevoUsuario = new Usuario({
      ...datos,
      password: passwordHash,
      rol: rolDoc._id
    });

    return await nuevoUsuario.save();
  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
};

/* ========================== */
/*     Obtener Usuarios       */
/* ========================== */
const obtenerUsuarios = async () => {
  try {
    return await Usuario.find()
      .populate('rol', 'nombre')
      .lean();
  } catch (error) {
    throw new Error(`Error al obtener usuarios: ${error.message}`);
  }
};

/* ========================== */
/*   Obtener Usuario por ID   */
/* ========================== */
const obtenerUsuarioPorId = async (id) => {
  try {
    const usuario = await Usuario.findById(id).populate('rol', 'nombre').lean();
    if (!usuario) throw new Error('Usuario no encontrado');
    return usuario;
  } catch (error) {
    throw new Error(`Error al obtener usuario por ID: ${error.message}`);
  }
};

/* ========================== */
/*     Actualizar Usuario     */
/* ========================== */
const actualizarUsuario = async (id, datos) => {
  try {
    const { correo, rol } = datos;

    // Validar si el correo ya está en uso por otro
    if (correo) {
      const existente = await Usuario.findOne({ correo, _id: { $ne: id } });
      if (existente) {
        throw new Error('El correo ya está en uso por otro usuario');
      }
    }

    // Si se va a actualizar el rol
    if (rol) {
      const rolDoc = await Rol.findOne({ nombre: rol });
      if (!rolDoc) {
        throw new Error(`El rol '${rol}' no existe`);
      }
      datos.rol = rolDoc._id;
    }

    const actualizado = await Usuario.findByIdAndUpdate(id, datos, {
      new: true,
      runValidators: true
    }).populate('rol', 'nombre');

    if (!actualizado) throw new Error('Usuario no encontrado');

    return actualizado;
  } catch (error) {
    throw new Error(`Error al actualizar usuario: ${error.message}`);
  }
};

/* ========================== */
/*     Eliminar (Desactivar) Usuario */
/* ========================== */
const eliminarUsuario = async (id) => {
  try {
    const eliminado = await Usuario.findByIdAndUpdate(
      id,
      { estado: false },
      { new: true }
    );
    if (!eliminado) throw new Error('Usuario no encontrado');
    return eliminado;
  } catch (error) {
    throw new Error(`Error al eliminar usuario: ${error.message}`);
  }
};

/* ========================== */
/*     Cambiar Estado         */
/* ========================== */
const cambiarEstadoUsuario = async (id, estado) => {
  try {
    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );
    if (!actualizado) throw new Error('Usuario no encontrado');
    return actualizado;
  } catch (error) {
    throw new Error(`Error al cambiar estado del usuario: ${error.message}`);
  }
};

module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario
};
