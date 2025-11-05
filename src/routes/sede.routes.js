const express = require('express');
const router = express.Router();

const Sede = require('../models/Sede.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');

// ==========================
// Obtener todas las sedes
// ==========================
router.get('/', async (req, res) => {
  try {
    const sedes = await Sede.find().sort({ nombre: 1 }).lean();
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener sedes', error: error.message });
  }
});

// ==========================
// Crear una nueva sede
// ==========================
router.post('/', async (req, res) => {
  try {
    const { nombre, direccion, telefono } = req.body;

    if (!nombre || !direccion || !telefono) {
      return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    const nuevaSede = new Sede({
      nombre,
      direccion,
      telefono,
      estado: true
    });

    await nuevaSede.save();
    res.status(201).json({ mensaje: 'Sede creada correctamente', sede: nuevaSede });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear sede', error: error.message });
  }
});

// ==========================
// Editar una sede existente
// ==========================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, telefono } = req.body;

    const sedeActualizada = await Sede.findByIdAndUpdate(
      id,
      { nombre, direccion, telefono },
      { new: true }
    );

    if (!sedeActualizada) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    res.json({ mensaje: 'Sede actualizada correctamente', sede: sedeActualizada });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar sede', error: error.message });
  }
});

// ==========================
// Activar / Desactivar sede
// ==========================
router.patch('/:id/estado', async (req, res) => {
  try {
    const { id } = req.params;

    const sede = await Sede.findById(id);
    if (!sede) {
      return res.status(404).json({ mensaje: 'Sede no encontrada' });
    }

    sede.estado = !sede.estado;
    await sede.save();

    res.json({
      mensaje: `Sede ${sede.estado ? 'activada' : 'desactivada'} correctamente`,
      sede
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar el estado de la sede', error: error.message });
  }
});

// ==========================
// Obtener puestos disponibles por sede
// ==========================
router.get('/:sedeId/puestos', async (req, res) => {
  try {
    const { sedeId } = req.params;

    const ocupados = await Peluquero.find({ sede: sedeId, estado: true }).select('puestoTrabajo').lean();
    const ocupadosIds = ocupados.map(p => p.puestoTrabajo.toString());

    const disponibles = await PuestoTrabajo.find({ sede: sedeId, _id: { $nin: ocupadosIds } }).lean();

    res.json(disponibles);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener puestos disponibles', error: error.message });
  }
});

module.exports = router;
