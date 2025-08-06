const Peluquero = require('../models/Peluquero.model');
const Usuario = require('../models/Usuario.model');

// ✅ Crear Peluquero (asociado a un usuario existente)
const crearPeluquero = async (req, res) => {
  try {
    const {
      usuario,  // ID del usuario
      especialidades,
      experiencia,
      telefono_profesional,
      direccion_profesional,
      genero,
      fecha_nacimiento,
      sede,
      puestoTrabajo
    } = req.body;

    const usuarioDB = await Usuario.findById(usuario);
    if (!usuarioDB) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const nuevoPeluquero = new Peluquero({
      usuario,
      especialidades,
      experiencia,
      telefono_profesional,
      direccion_profesional,
      genero,
      fecha_nacimiento,
      sede,
      puestoTrabajo
    });

    await nuevoPeluquero.save();

    res.status(201).json(nuevoPeluquero);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear peluquero', error: error.message });
  }
};

// ✅ Obtener todos los peluqueros
const obtenerPeluqueros = async (req, res) => {
  try {
    const peluqueros = await Peluquero.find()
      .populate('usuario', 'nombre correo estado')
      .populate('sede', 'nombre')
      .populate('puestoTrabajo', 'nombre');
    res.json(peluqueros);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener peluqueros', error: error.message });
  }
};

// ✅ Obtener peluquero por ID
const obtenerPeluqueroPorId = async (req, res) => {
  try {
    const peluquero = await Peluquero.findById(req.params.id)
      .populate('usuario', 'nombre correo estado')
      .populate('sede', 'nombre')
      .populate('puestoTrabajo', 'nombre');
    if (!peluquero) {
      return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
    }
    res.json(peluquero);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener peluquero', error: error.message });
  }
};

// ✅ Actualizar Peluquero
const actualizarPeluquero = async (req, res) => {
  try {
    const {
      especialidades,
      experiencia,
      telefono_profesional,
      direccion_profesional,
      genero,
      fecha_nacimiento,
      sede,
      puestoTrabajo
    } = req.body;

    const peluquero = await Peluquero.findById(req.params.id);
    if (!peluquero) {
      return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
    }

    peluquero.especialidades = especialidades ?? peluquero.especialidades;
    peluquero.experiencia = experiencia ?? peluquero.experiencia;
    peluquero.telefono_profesional = telefono_profesional ?? peluquero.telefono_profesional;
    peluquero.direccion_profesional = direccion_profesional ?? peluquero.direccion_profesional;
    peluquero.genero = genero ?? peluquero.genero;
    peluquero.fecha_nacimiento = fecha_nacimiento ?? peluquero.fecha_nacimiento;
    peluquero.sede = sede ?? peluquero.sede;
    peluquero.puestoTrabajo = puestoTrabajo ?? peluquero.puestoTrabajo;

    await peluquero.save();

    res.json({ mensaje: 'Peluquero actualizado correctamente', peluquero });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar peluquero', error: error.message });
  }
};

// ✅ Desactivar (eliminar lógico) peluquero
const desactivarPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findById(req.params.id).populate('usuario');
    if (!peluquero) {
      return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
    }

    peluquero.usuario.estado = false;
    await peluquero.usuario.save();

    res.json({ mensaje: 'Peluquero desactivado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al desactivar peluquero', error: error.message });
  }
};

// ✅ Activar peluquero
const activarPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findById(req.params.id).populate('usuario');
    if (!peluquero) {
      return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
    }

    peluquero.usuario.estado = true;
    await peluquero.usuario.save();

    res.json({ mensaje: 'Peluquero activado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al activar peluquero', error: error.message });
  }
};

module.exports = {
  crearPeluquero,
  obtenerPeluqueros,
  obtenerPeluqueroPorId,
  actualizarPeluquero,
  desactivarPeluquero,
  activarPeluquero
};
