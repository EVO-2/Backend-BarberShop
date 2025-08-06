const Usuario = require('../models/Usuario.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const Rol = require('../models/Rol.model');
const mongoose = require('mongoose');

// ==========================
//      Listar Usuarios
// ==========================
const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .populate('rol', 'nombre')
      .populate({
        path: 'cliente',
        select: 'telefono direccion genero fecha_nacimiento'
      })
      .populate({
        path: 'peluquero',
        populate: [
          { path: 'sede', select: 'nombre' },
          { path: 'puestoTrabajo', select: 'nombre' }
        ],
        select: 'telefono_profesional direccion_profesional genero fecha_nacimiento especialidades experiencia'
      })
      .lean();

    const usuariosConDetalles = usuarios.map(usuario => {
      usuario.detalles = usuario.cliente || usuario.peluquero || null;
      delete usuario.cliente;
      delete usuario.peluquero;
      return usuario;
    });

    res.status(200).json(usuariosConDetalles);
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    res.status(500).json({ mensaje: 'Error al listar usuarios' });
  }
};

// ==========================
//   Obtener Usuario por ID
// ==========================
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findById(id)
      .populate('rol', 'nombre')
      .lean();

    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (usuario.cliente) {
      const cliente = await Cliente.findById(usuario.cliente).lean();
      usuario.detalles = cliente || null;
    } else if (usuario.peluquero) {
      const peluquero = await Peluquero.findById(usuario.peluquero)
        .populate('sede', 'nombre')
        .populate('puestoTrabajo', 'nombre')
        .lean();
      usuario.detalles = peluquero || null;
    } else {
      usuario.detalles = null;
    }

    delete usuario.cliente;
    delete usuario.peluquero;

    res.json(usuario);
  } catch (error) {
    console.error('❌ Error al obtener usuario por ID:', error);
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

// ==========================
//        Crear Usuario
// ==========================
const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, password, rol, estado, detalles } = req.body;

    // Validar que el rol exista y sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const existeRol = await Rol.findById(rol);
    if (!existeRol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    const nuevoUsuario = new Usuario({ nombre, correo, password, rol, estado });

    // Crear Cliente o Peluquero según el rol
    if (existeRol.nombre === 'cliente') {
      const nuevoCliente = new Cliente({
        usuario: nuevoUsuario._id,
        telefono: detalles.telefono,
        direccion: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento
      });
      await nuevoCliente.save();
      nuevoUsuario.cliente = nuevoCliente._id;
    } else if (existeRol.nombre === 'barbero') {
      const nuevoPeluquero = new Peluquero({
        usuario: nuevoUsuario._id,
        telefono_profesional: detalles.telefono,
        direccion_profesional: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento,
        especialidades: detalles.especialidades,
        experiencia: detalles.experiencia,
        sede: detalles.sede,
        puestoTrabajo: detalles.puestoTrabajo
      });
      await nuevoPeluquero.save();
      nuevoUsuario.peluquero = nuevoPeluquero._id;
    }

    await nuevoUsuario.save();

    res.status(201).json(nuevoUsuario);
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario', detalles: error.message });
  }
};

// ==========================
//      Actualizar Usuario
// ==========================
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, password, rol, estado, detalles } = req.body;

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (rol && !mongoose.Types.ObjectId.isValid(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    usuario.nombre = nombre ?? usuario.nombre;
    usuario.correo = correo ?? usuario.correo;
    if (password) usuario.password = password;
    usuario.rol = rol ?? usuario.rol;
    usuario.estado = estado ?? usuario.estado;

    await usuario.save();

    // Actualizar Cliente o Peluquero
    if (usuario.cliente && detalles) {
      await Cliente.findByIdAndUpdate(usuario.cliente, {
        telefono: detalles.telefono,
        direccion: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento
      });
    } else if (usuario.peluquero && detalles) {
      await Peluquero.findByIdAndUpdate(usuario.peluquero, {
        telefono_profesional: detalles.telefono,
        direccion_profesional: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento,
        especialidades: detalles.especialidades,
        experiencia: detalles.experiencia,
        sede: detalles.sede,
        puestoTrabajo: detalles.puestoTrabajo
      });
    }

    return res.status(200).json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    return res.status(500).json({ message: 'Error al actualizar usuario' });
  }
};

// ==========================
//      Eliminar Usuario (Soft delete)
// ==========================
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByIdAndUpdate(id, { estado: false }, { new: true });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    res.status(200).json({ mensaje: 'Usuario desactivado exitosamente' });
  } catch (error) {
    console.error('❌ Error al desactivar usuario:', error);
    res.status(500).json({ mensaje: 'Error al desactivar usuario', error: error.message });
  }
};

// ==========================
//     Cambiar Estado Usuario
// ==========================
const cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const usuario = await Usuario.findByIdAndUpdate(id, { estado }, { new: true });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    res.status(200).json({ mensaje: 'Estado del usuario actualizado', usuario });
  } catch (error) {
    console.error('❌ Error al cambiar estado del usuario:', error);
    res.status(500).json({ mensaje: 'Error al cambiar estado del usuario', error: error.message });
  }
};

// ==========================
//     Subir Foto de Perfil
// ==========================
const subirFotoPerfil = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ mensaje: 'No se subió ninguna foto' });
    }

    const usuario = await Usuario.findByIdAndUpdate(
      id,
      { foto: req.file.filename },
      { new: true }
    );

    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    res.status(200).json({ mensaje: 'Foto de perfil actualizada', usuario });
  } catch (error) {
    console.error('❌ Error al subir la foto de perfil:', error);
    res.status(500).json({ mensaje: 'Error al subir la foto de perfil', error: error.message });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario,
  subirFotoPerfil
};
