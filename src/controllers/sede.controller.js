// controllers/sede.controller.js

const Sede = require('../models/Sede.model');

// GET
exports.obtenerSedes = async (req, res) => {
  try {
    const sedes = await Sede.find().sort({ nombre: 1 });
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener sedes' });
  }
};

// POST
exports.crearSede = async (req, res) => {
  try {
    const { nombre, direccion, telefono, estado } = req.body;

    const nuevaSede = new Sede({
      nombre,
      direccion,
      telefono,
      estado: estado ?? true
    });

    await nuevaSede.save();

    res.status(201).json(nuevaSede);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear sede' });
  }
};

// PUT
exports.actualizarSede = async (req, res) => {
  try {
    const { id } = req.params;

    const sede = await Sede.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    res.json(sede);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar sede' });
  }
};

// PATCH
exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const sede = await Sede.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    res.json(sede);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar estado' });
  }
};