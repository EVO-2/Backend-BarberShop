const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Sede = require('../models/Sede.model');

const obtenerPuestos = async (req, res) => {
  try {
    const { sede_id } = req.query;

    const filtro = { estado: true };
    if (sede_id) {
      filtro.sede = sede_id;
    }

    const puestos = await PuestoTrabajo.find(filtro)
      .populate('sede', 'nombre direccion') // traer nombre y dirección de la sede
      .populate({
        path: 'peluquero',
        populate: {
          path: 'usuario',
          select: 'nombre correo' // traer nombre y correo del peluquero
        }
      })
      .exec();

    res.json(puestos);
  } catch (error) {
    console.error('Error al obtener puestos de trabajo:', error);
    res.status(500).json({ mensaje: 'Error al obtener los puestos de trabajo' });
  }
};

module.exports = {
  obtenerPuestos
};