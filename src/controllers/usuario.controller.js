const Usuario = require('../models/Usuario.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const Rol = require('../models/Rol.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
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

    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

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
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

// ==========================
//        Crear Usuario
// ==========================
const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, password, rol, estado, detalles } = req.body;

    if (!mongoose.Types.ObjectId.isValid(rol)) return res.status(400).json({ error: 'Rol inválido' });
    const existeRol = await Rol.findById(rol);
    if (!existeRol) return res.status(404).json({ error: 'Rol no encontrado' });

    const nuevoUsuario = new Usuario({ nombre, correo, password, rol, estado });

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
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (rol && !mongoose.Types.ObjectId.isValid(rol)) return res.status(400).json({ error: 'Rol inválido' });

    usuario.nombre = nombre ?? usuario.nombre;
    usuario.correo = correo ?? usuario.correo;
    if (password) usuario.password = password;
    usuario.rol = rol ?? usuario.rol;
    usuario.estado = estado ?? usuario.estado;
    await usuario.save();

    if (usuario.cliente && detalles) {
      await Cliente.findByIdAndUpdate(usuario.cliente, {
        telefono: detalles.telefono,
        direccion: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento
      });
    } else if (usuario.peluquero && detalles) {
      const peluquero = await Peluquero.findById(usuario.peluquero);
      if (!peluquero) return res.status(404).json({ message: 'Peluquero no encontrado' });

      const puestoAnteriorId = peluquero.puestoTrabajo ? peluquero.puestoTrabajo.toString() : null;

      if (estado === false && peluquero.puestoTrabajo) {
        await PuestoTrabajo.findByIdAndUpdate(peluquero.puestoTrabajo, { peluquero: null });
        peluquero.puestoTrabajo = null;
      }

      if (detalles.puestoTrabajo && detalles.puestoTrabajo !== puestoAnteriorId) {
        const puestoOcupado = await PuestoTrabajo.findOne({
          _id: detalles.puestoTrabajo,
          peluquero: { $ne: peluquero._id }
        });
        if (puestoOcupado && puestoOcupado.peluquero) {
          return res.status(400).json({ message: 'El puesto seleccionado ya está ocupado por otro peluquero.' });
        }
      }

      peluquero.telefono_profesional = detalles.telefono ?? peluquero.telefono_profesional;
      peluquero.direccion_profesional = detalles.direccion ?? peluquero.direccion_profesional;
      peluquero.genero = detalles.genero ?? peluquero.genero;
      peluquero.fecha_nacimiento = detalles.fecha_nacimiento ?? peluquero.fecha_nacimiento;
      peluquero.especialidades = detalles.especialidades ?? peluquero.especialidades;
      peluquero.experiencia = detalles.experiencia ?? peluquero.experiencia;
      peluquero.sede = detalles.sede ?? peluquero.sede;
      peluquero.estado = estado !== undefined ? estado : peluquero.estado;

      if (detalles.puestoTrabajo && estado !== false) peluquero.puestoTrabajo = detalles.puestoTrabajo;

      await peluquero.save();

      if (detalles.puestoTrabajo && detalles.puestoTrabajo !== puestoAnteriorId && estado !== false) {
        if (puestoAnteriorId) await PuestoTrabajo.findByIdAndUpdate(puestoAnteriorId, { peluquero: null });
        await PuestoTrabajo.findByIdAndUpdate(detalles.puestoTrabajo, { peluquero: peluquero._id });
      }
    }

    res.status(200).json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario' });
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
    res.status(500).json({ mensaje: 'Error al cambiar estado del usuario', error: error.message });
  }
};

// ==========================
//     Subir Foto de Perfil
// ==========================
const subirFotoPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ mensaje: 'No se subió ninguna foto' });

    const usuario = await Usuario.findByIdAndUpdate(id, { foto: req.file.filename }, { new: true });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    res.status(200).json({ mensaje: 'Foto de perfil actualizada', usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al subir la foto de perfil', error: error.message });
  }
};

// ===================
//     Verificar Puesto
// ===================
const verificarPuesto = async (req, res) => {
  try {
    const { puestoId } = req.params;
    const { usuarioId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(puestoId))
      return res.status(400).json({ mensaje: 'ID de puesto inválido' });

    const puesto = await PuestoTrabajo.findById(puestoId)
      .populate('peluquero', 'usuario estado');
    if (!puesto) return res.status(404).json({ mensaje: 'Puesto no encontrado' });

    if (!puesto.peluquero || puesto.peluquero.estado === false)
      return res.json({ disponible: true });

    const peluqueroUsuarioId = puesto.peluquero.usuario ? puesto.peluquero.usuario.toString() : null;
    if (usuarioId && peluqueroUsuarioId && peluqueroUsuarioId === usuarioId.toString())
      return res.json({ disponible: true });

    return res.json({ disponible: false });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario,
  subirFotoPerfil,
  verificarPuesto
};
