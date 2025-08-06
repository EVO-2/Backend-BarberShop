const express = require('express');
const router = express.Router();

const Sede = require('../models/Sede.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');

// ==========================
// Obtener todas las Sedes
// ==========================
router.get('/', async (req, res) => {
  try {
    const sedes = await Sede.find().lean();
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener sedes', error: error.message });
  }
});

// ==========================
// Obtener Puestos disponibles de una Sede
// ==========================
router.get('/:sedeId/puestos', async (req, res) => {
  try {
    const { sedeId } = req.params;

    // Buscar puestos ocupados en esa sede
    const ocupados = await Peluquero.find({ sede: sedeId, estado: true }).select('puestoTrabajo').lean();
    const ocupadosIds = ocupados.map(p => p.puestoTrabajo.toString());

    // Buscar puestos disponibles
    const disponibles = await PuestoTrabajo.find({ sede: sedeId, _id: { $nin: ocupadosIds } }).lean();

    res.json(disponibles);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener puestos disponibles', error: error.message });
  }
});

module.exports = router;
