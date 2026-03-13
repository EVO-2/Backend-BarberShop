const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const PuestoTrabajo = require('../models/PuestoTrabajo');


/* ========================== */
/*       Crear Usuario        */
/* ========================== */
const crearUsuario = async (datos) => {
  try {

    const { correo, password, rol, detalles } = datos;

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

    await nuevoUsuario.save();

    // Crear documento asociado
    if (rol === 'cliente') {
      await Cliente.create({ usuario: nuevoUsuario._id, ...detalles });
    }
    else if (rol === 'barbero') {
      await Peluquero.create({ usuario: nuevoUsuario._id, ...detalles });
    }

    return nuevoUsuario;

  } catch (error) {
    throw new Error(`Error al crear usuario: ${error.message}`);
  }
};


/* ========================== */
/*     Obtener Usuarios       */
/* ========================== */
const obtenerUsuarios = async () => {
  try {

    const usuarios = await Usuario.find()
      .populate('rol', 'nombre')
      .populate('cliente')
      .populate('peluquero')
      .lean();

    return usuarios;

  } catch (error) {
    throw new Error(`Error al obtener usuarios: ${error.message}`);
  }
};


/* ========================== */
/*   Obtener Usuario por ID   */
/* ========================== */
const obtenerUsuarioPorId = async (id) => {
  try {

    const usuario = await Usuario.findById(id)
      .populate('rol', 'nombre')
      .populate('cliente')
      .populate('peluquero')
      .lean();

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

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

    const { correo, rol, cliente, peluquero } = datos;

    const usuarioActual = await Usuario.findById(id);

    if (!usuarioActual) {
      throw new Error('Usuario no encontrado');
    }

    /* ---------------------------------- */
    /* Mantener la foto si no viene nueva */
    /* ---------------------------------- */
    if (!datos.foto) {
      datos.foto = usuarioActual.foto;
    }

    /* ----------------------------- */
    /* Validar correo duplicado      */
    /* ----------------------------- */
    if (correo) {

      const existente = await Usuario.findOne({
        correo,
        _id: { $ne: id }
      });

      if (existente) {
        throw new Error('El correo ya está en uso por otro usuario');
      }
    }

    let nuevoRol = null;

    if (rol) {

      const rolDoc = await Rol.findOne({ nombre: rol });

      if (!rolDoc) {
        throw new Error(`El rol '${rol}' no existe`);
      }

      nuevoRol = rolDoc._id;
    }

    const camposUsuario = { ...datos };

    delete camposUsuario.cliente;
    delete camposUsuario.peluquero;

    if (nuevoRol) {
      camposUsuario.rol = nuevoRol;
    }

    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      camposUsuario,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('rol', 'nombre')
      .lean();

    if (!usuarioActualizado) {
      throw new Error('Usuario no encontrado');
    }


    /* ========================= */
    /* Cliente                   */
    /* ========================= */
    if (rol === 'cliente' && cliente) {

      const clienteExistente = await Cliente.findOne({ usuario: id });

      if (clienteExistente) {
        await Cliente.updateOne({ usuario: id }, { $set: cliente });
      } else {
        await Cliente.create({ ...cliente, usuario: id });
      }

      await Peluquero.deleteOne({ usuario: id });

    }


    /* ========================= */
    /* Barbero                   */
    /* ========================= */
    if (rol === 'barbero' && peluquero) {

      const peluqueroExistente = await Peluquero.findOne({ usuario: id });

      if (peluqueroExistente) {
        await Peluquero.updateOne({ usuario: id }, { $set: peluquero });
      } else {
        await Peluquero.create({ ...peluquero, usuario: id });
      }

      await Cliente.deleteOne({ usuario: id });

    }

    return usuarioActualizado;

  } catch (error) {
    throw new Error(`Error al actualizar usuario: ${error.message}`);
  }
};


/* ========================== */
/*     Eliminar Usuario       */
/* ========================== */
const eliminarUsuario = async (id) => {
  try {

    const eliminado = await Usuario.findByIdAndUpdate(
      id,
      { estado: false },
      { new: true }
    ).lean();

    if (!eliminado) {
      throw new Error('Usuario no encontrado');
    }

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
    ).lean();

    if (!actualizado) {
      throw new Error('Usuario no encontrado');
    }

    return actualizado;

  } catch (error) {
    throw new Error(`Error al cambiar estado del usuario: ${error.message}`);
  }
};


/* ========================== */
/*     Verificar Puesto       */
/* ========================== */
const verificarPuesto = async (puestoId, usuarioId) => {

  if (!mongoose.Types.ObjectId.isValid(puestoId)) {
    throw new Error('ID de puesto inválido');
  }

  const puesto = await PuestoTrabajo
    .findById(puestoId)
    .populate('peluquero');

  if (!puesto) {
    throw new Error('Puesto no encontrado');
  }

  if (!puesto.peluquero || puesto.peluquero.usuario.toString() === usuarioId) {
    return { disponible: true };
  }

  return { disponible: false };
};


module.exports = {
  crearUsuario,
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  eliminarUsuario,
  verificarPuesto,
  cambiarEstadoUsuario
};