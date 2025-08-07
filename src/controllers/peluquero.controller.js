const Peluquero = require('../models/Peluquero.model');
const Usuario = require('../models/Usuario.model');
const PuestoTrabajo = require('../models/puestoTrabajo.model');

// ✅ Crear Peluquero (asociado a un usuario existente)
const crearPeluquero = async (req, res) => {
  try {
    const {
      usuario,
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

    // Asignar puesto al peluquero
    await PuestoTrabajo.findByIdAndUpdate(puestoTrabajo, { peluquero: nuevoPeluquero._id });

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

// ✅ Actualizar Peluquero (con validación de puesto)
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

    const puestoAnteriorId = peluquero.puestoTrabajo ? peluquero.puestoTrabajo.toString() : null;

    // Si el puesto cambia, validar si el nuevo puesto está ocupado por otro peluquero
    if (puestoTrabajo !== puestoAnteriorId) {
      const puestoOcupado = await PuestoTrabajo.findOne({
        _id: puestoTrabajo,
        peluquero: { $ne: peluquero._id }
      });

      if (puestoOcupado && puestoOcupado.peluquero) {
        return res.status(400).json({ mensaje: 'El puesto seleccionado ya está ocupado por otro peluquero.' });
      }
    }

    // Actualizar datos del peluquero
    peluquero.especialidades = especialidades ?? peluquero.especialidades;
    peluquero.experiencia = experiencia ?? peluquero.experiencia;
    peluquero.telefono_profesional = telefono_profesional ?? peluquero.telefono_profesional;
    peluquero.direccion_profesional = direccion_profesional ?? peluquero.direccion_profesional;
    peluquero.genero = genero ?? peluquero.genero;
    peluquero.fecha_nacimiento = fecha_nacimiento ?? peluquero.fecha_nacimiento;
    peluquero.sede = sede ?? peluquero.sede;
    peluquero.puestoTrabajo = puestoTrabajo ?? peluquero.puestoTrabajo;

    await peluquero.save();

    // Si el puesto cambió, liberar el anterior y asignar el nuevo
    if (puestoTrabajo !== puestoAnteriorId) {
      if (puestoAnteriorId) {
        await PuestoTrabajo.findByIdAndUpdate(puestoAnteriorId, { peluquero: null });
      }
      await PuestoTrabajo.findByIdAndUpdate(puestoTrabajo, { peluquero: peluquero._id });
    }

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
