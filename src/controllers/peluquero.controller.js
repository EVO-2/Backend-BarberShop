const Peluquero = require('../models/Peluquero.model');
const Usuario = require('../models/Usuario.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');

/* ───────────── Crear Peluquero ───────────── */
const crearPeluquero = async (req, res) => {
  try {
    const { usuario, especialidades, experiencia, telefono_profesional, direccion_profesional, genero, fecha_nacimiento, sede, puestoTrabajo } = req.body;

    const usuarioDB = await Usuario.findById(usuario);
    if (!usuarioDB) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    // Validar que el puesto no esté ocupado
    if (puestoTrabajo) {
      const puestoOcupado = await PuestoTrabajo.findOne({ _id: puestoTrabajo, peluquero: { $ne: null } });
      if (puestoOcupado) {
        return res.status(400).json({ ok: false, msg: 'El puesto seleccionado ya está ocupado.' });
      }
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

    if (puestoTrabajo) {
      await PuestoTrabajo.findByIdAndUpdate(puestoTrabajo, { peluquero: nuevoPeluquero._id });
    }

    const peluqueroPopulado = await Peluquero.findById(nuevoPeluquero._id)
      .populate('usuario', 'nombre correo foto estado')
      .populate('sede', 'nombre direccion')
      .populate('puestoTrabajo', 'nombre');

    return res.status(201).json({ ok: true, msg: 'Peluquero creado correctamente', data: peluqueroPopulado });
  } catch (error) {
    console.error('❌ Error al crear peluquero:', error);
    return res.status(500).json({ ok: false, msg: 'Error al crear peluquero', error: error.message });
  }
};

/* ───────────── Obtener todos ───────────── */
const obtenerPeluqueros = async (req, res) => {
  try {
    const peluqueros = await Peluquero.find()
      .populate('usuario', 'nombre correo foto estado')
      .populate('sede', 'nombre direccion')
      .populate('puestoTrabajo', 'nombre');

    return res.json({ ok: true, data: peluqueros });
  } catch (error) {
    return res.status(500).json({ ok: false, msg: 'Error al obtener peluqueros', error: error.message });
  }
};

/* ───────────── Obtener por ID ───────────── */
const obtenerPeluqueroPorId = async (req, res) => {
  try {
    const peluquero = await Peluquero.findById(req.params.id)
      .populate('usuario', 'nombre correo foto estado')
      .populate('sede', 'nombre direccion')
      .populate('puestoTrabajo', 'nombre');

    if (!peluquero) {
      return res.status(404).json({ ok: false, msg: 'Peluquero no encontrado' });
    }

    return res.json({ ok: true, data: peluquero });
  } catch (error) {
    return res.status(500).json({ ok: false, msg: 'Error al obtener peluquero', error: error.message });
  }
};

/* ───────────── Actualizar ───────────── */
const actualizarPeluquero = async (req, res) => {
  try {
    const { especialidades, experiencia, telefono_profesional, direccion_profesional, genero, fecha_nacimiento, sede, puestoTrabajo, estado } = req.body;

    const peluquero = await Peluquero.findById(req.params.id);
    if (!peluquero) {
      return res.status(404).json({ ok: false, msg: 'Peluquero no encontrado' });
    }

    const puestoAnteriorId = peluquero.puestoTrabajo ? peluquero.puestoTrabajo.toString() : null;

    // Desactivar -> liberar puesto
    if (estado === false && peluquero.puestoTrabajo) {
      await PuestoTrabajo.findByIdAndUpdate(peluquero.puestoTrabajo, { peluquero: null });
      peluquero.puestoTrabajo = null;
    }

    // Validar nuevo puesto
    if (puestoTrabajo && puestoTrabajo !== puestoAnteriorId && estado !== false) {
      const puestoOcupado = await PuestoTrabajo.findOne({ _id: puestoTrabajo, peluquero: { $ne: null } });
      if (puestoOcupado) {
        return res.status(400).json({ ok: false, msg: 'El puesto seleccionado ya está ocupado.' });
      }
    }

    // Actualizar datos
    peluquero.especialidades = especialidades ?? peluquero.especialidades;
    peluquero.experiencia = experiencia ?? peluquero.experiencia;
    peluquero.telefono_profesional = telefono_profesional ?? peluquero.telefono_profesional;
    peluquero.direccion_profesional = direccion_profesional ?? peluquero.direccion_profesional;
    peluquero.genero = genero ?? peluquero.genero;
    peluquero.fecha_nacimiento = fecha_nacimiento ?? peluquero.fecha_nacimiento;
    peluquero.sede = sede ?? peluquero.sede;
    peluquero.estado = estado !== undefined ? estado : peluquero.estado;

    if (puestoTrabajo && estado !== false) {
      peluquero.puestoTrabajo = puestoTrabajo;
    }

    await peluquero.save();

    // Liberar/Asignar puestos
    if (puestoTrabajo && puestoTrabajo !== puestoAnteriorId && estado !== false) {
      if (puestoAnteriorId) {
        await PuestoTrabajo.findByIdAndUpdate(puestoAnteriorId, { peluquero: null });
      }
      await PuestoTrabajo.findByIdAndUpdate(puestoTrabajo, { peluquero: peluquero._id });
    }

    const peluqueroActualizado = await Peluquero.findById(peluquero._id)
      .populate('usuario', 'nombre correo foto estado')
      .populate('sede', 'nombre direccion')
      .populate('puestoTrabajo', 'nombre');

    return res.json({ ok: true, msg: 'Peluquero actualizado correctamente', data: peluqueroActualizado });
  } catch (error) {
    console.error('❌ Error al actualizar peluquero:', error);
    return res.status(500).json({ ok: false, msg: 'Error al actualizar peluquero', error: error.message });
  }
};

/* ───────────── Desactivar ───────────── */
const desactivarPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findById(req.params.id).populate('usuario');
    if (!peluquero) {
      return res.status(404).json({ ok: false, msg: 'Peluquero no encontrado' });
    }

    if (peluquero.puestoTrabajo) {
      await PuestoTrabajo.findByIdAndUpdate(peluquero.puestoTrabajo, { peluquero: null });
      peluquero.puestoTrabajo = null;
    }

    peluquero.usuario.estado = false;
    await peluquero.usuario.save();

    peluquero.estado = false;
    await peluquero.save();

    return res.json({ ok: true, msg: 'Peluquero desactivado y puesto liberado correctamente' });
  } catch (error) {
    return res.status(500).json({ ok: false, msg: 'Error al desactivar peluquero', error: error.message });
  }
};

/* ───────────── Activar ───────────── */
const activarPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findById(req.params.id).populate('usuario');
    if (!peluquero) {
      return res.status(404).json({ ok: false, msg: 'Peluquero no encontrado' });
    }

    peluquero.usuario.estado = true;
    await peluquero.usuario.save();

    peluquero.estado = true;
    await peluquero.save();

    return res.json({ ok: true, msg: 'Peluquero activado correctamente' });
  } catch (error) {
    return res.status(500).json({ ok: false, msg: 'Error al activar peluquero', error: error.message });
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
