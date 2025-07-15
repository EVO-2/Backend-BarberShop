const Sede = require('../models/Sede.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');
const Servicio = require('../models/Servicio.model');

const CatalogoController = {
  obtenerSedes: async (_req, res) => {
    try {
      const sedes = await Sede.find({ estado: true });
      res.json(sedes);
    } catch (error) {
      console.error('Error al obtener sedes:', error);
      res.status(500).json({ mensaje: 'Error interno al obtener sedes' });
    }
  },

  obtenerPuestosPorSede: async (req, res) => {
    try {
      const { sede } = req.query;
      const puestos = await PuestoTrabajo.find({ sede, estado: true });
      res.json(puestos);
    } catch (error) {
      console.error('Error al obtener puestos:', error);
      res.status(500).json({ mensaje: 'Error interno al obtener puestos' });
    }
  },

  obtenerPeluqueros: async (_req, res) => {
    try {
        const peluqueros = await Peluquero.find({ estado: true })
        .populate('usuario', 'nombre'); // <- Esto trae solo el campo 'nombre' del usuario
        res.json(peluqueros);
    } catch (error) {
        console.error('Error al obtener peluqueros:', error);
        res.status(500).json({ mensaje: 'Error interno al obtener peluqueros' });
    }
    },

  obtenerServicios: async (_req, res) => {
    try {
      const servicios = await Servicio.find({ estado: true });
      res.json(servicios);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
      res.status(500).json({ mensaje: 'Error interno al obtener servicios' });
    }
  }
};

module.exports = CatalogoController;
