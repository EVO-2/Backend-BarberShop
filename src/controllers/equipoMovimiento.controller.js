// controllers/equipoMovimiento.controller.js
const EquipoMovimiento = require('../models/EquipoMovimiento.model');
const Equipo = require('../models/Equipo.model');

/**
 * Crear movimiento manual de un equipo
 * Tipos: traspaso, mantenimiento, prestamo, devolucion, baja, etc.
 */
const crearMovimiento = async (req, res) => {
  try {
    const data = req.body;

    // Asignar usuario que crea el movimiento desde middleware de auth
    if (req.uid) data.creadoPor = req.uid;

    // Validar que el equipo exista
    const equipo = await Equipo.findById(data.equipo);
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    // Crear movimiento
    const movimiento = await EquipoMovimiento.create(data);

    // ===========================
    // Actualizar equipo según movimiento
    // ===========================
    const update = {};

    // Traspaso de sede o puesto
    if (data.toSede && String(data.toSede) !== String(equipo.sede)) {
      update.sede = data.toSede;
    }
    if (data.toPuesto && String(data.toPuesto) !== String(equipo.puesto)) {
      update.puesto = data.toPuesto;
    }

    // Prestamo / asignacion a usuario
    if (data.responsable && String(data.responsable) !== String(equipo.asignadoA)) {
      update.asignadoA = data.responsable;
    }

    // Mantenimiento o reparación: actualizar ultimaRevision
    if (['mantenimiento', 'reparacion'].includes(data.tipo)) {
      update.ultimaRevision = data.fechaInicio || new Date();
    }

    // Cambio de estado (opcional)
    if (data.estado && data.estado !== equipo.estado) {
      update.estado = data.estado;
    }

    // Aplicar cambios si hay
    if (Object.keys(update).length > 0) {
      await Equipo.findByIdAndUpdate(data.equipo, update, { new: true });
    }

    res.status(201).json({ data: movimiento });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error creando movimiento' });
  }
};

/**
 * Listar movimientos por equipo
 */
const listarMovimientosPorEquipo = async (req, res) => {
  try {
    const { id } = req.params; // equipo id

    const movimientos = await EquipoMovimiento.find({ equipo: id })
      .populate('creadoPor', 'nombre correo')
      .populate('responsable', 'nombre')
      .populate('fromSede', 'nombre direccion')
      .populate('toSede', 'nombre direccion')
      .populate('fromPuesto', 'nombre')
      .populate('toPuesto', 'nombre')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ data: movimientos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error listando movimientos' });
  }
};

module.exports = {
  crearMovimiento,
  listarMovimientosPorEquipo
};
