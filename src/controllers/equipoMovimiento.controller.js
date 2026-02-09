// controllers/equipoMovimiento.controller.js
const EquipoMovimiento = require('../models/EquipoMovimiento.model');
const Equipo = require('../models/Equipo.model');

// Crear movimiento manual (traspaso, mantenimiento, prestamo, devolucion, etc.)
const crearMovimiento = async (req, res) => {
  try {
    const data = req.body;
    if (req.uid) data.creadoPor = req.uid;

    // Validar equipo existe
    const equipo = await Equipo.findById(data.equipo);
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    const movimiento = await EquipoMovimiento.create(data);

    // Opcional: actualizar equipo si movimiento implica asignacion/traspaso/estado
    const update = {};
    if (data.toSede) update.sede = data.toSede;
    if (data.toPuesto) update.puesto = data.toPuesto;
    if (data.responsable) update.asignadoA = data.responsable;
    if (data.tipo === 'mantenimiento' || data.tipo === 'reparacion') {
      update.ultimaRevision = data.fechaInicio || new Date();
    }
    if (Object.keys(update).length > 0) {
      await Equipo.findByIdAndUpdate(data.equipo, update);
    }

    res.status(201).json({ data: movimiento });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error creando movimiento' });
  }
};

// Listar movimientos por equipo
const listarMovimientosPorEquipo = async (req, res) => {
  try {
    const { id } = req.params; // equipo id
    const movimientos = await EquipoMovimiento.find({ equipo: id })
      .populate('creadoPor', 'nombre correo')
      .populate('responsable', 'nombre')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ data: movimientos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error listando movimientos' });
  }
};

module.exports = { crearMovimiento, listarMovimientosPorEquipo };
