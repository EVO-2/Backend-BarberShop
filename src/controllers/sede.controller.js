const Sede = require('../models/Sede.model');

exports.obtenerSedes = async (req, res) => {
  try {
    const sedes = await Sede.findAll();
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener sedes', error });
  }
};