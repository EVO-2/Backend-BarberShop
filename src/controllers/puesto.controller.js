const PuestoTrabajo = require('../models/puestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');

// GET /api/puestos
const obtenerPuestos = async (req, res) => {
  try {
    const { sede_id, peluquero_id } = req.query;

    if (!sede_id) {
      return res.status(400).json({ message: 'El parámetro sede_id es obligatorio' });
    }

    // Obtener todos los puestos activos de la sede, incluyendo sede y peluquero
    const puestos = await PuestoTrabajo.find({ sede: sede_id, estado: true })
      .populate('sede')
      .populate('peluquero');

    // Si no hay peluquero_id (modo crear), devolver puestos con flag "ocupado"
    if (!peluquero_id) {
      const puestosLibres = puestos.map(p => ({
        _id: p._id,
        nombre: p.nombre,
        sede: p.sede,
        ocupado: !!p.peluquero // true si tiene peluquero asignado
      }));
      return res.json(puestosLibres);
    }

    // Obtener el peluquero en edición para permitir su propio puesto
    const peluquero = await Peluquero.findById(peluquero_id).populate('puestoTrabajo');
    const puestoActualId = peluquero?.puestoTrabajo?._id?.toString();

    // Mapear puestos indicando si están ocupados (excepto su propio puesto actual)
    const puestosDisponibles = puestos.map(p => {
      const peluqueroAsignado = p.peluquero?._id?.toString();
      const esOcupadoPorOtro = peluqueroAsignado && peluqueroAsignado !== peluquero_id;

      return {
        _id: p._id,
        nombre: p.nombre,
        sede: p.sede,
        ocupado: esOcupadoPorOtro
      };
    });

    return res.json(puestosDisponibles);
  } catch (error) {
    console.error('❌ Error obteniendo puestos:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /api/puestos/:id/liberar
const liberarPuesto = async (req, res) => {
  try {
    const puesto = await PuestoTrabajo.findById(req.params.id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    puesto.peluquero = null;
    await puesto.save();

    res.json({ message: 'Puesto liberado exitosamente' });
  } catch (error) {
    console.error('❌ Error liberando puesto:', error);
    res.status(500).json({ message: 'Error liberando puesto' });
  }
};

// PUT /api/puestos/:id/asignar
const asignarPuesto = async (req, res) => {
  try {
    const { peluqueroId } = req.body;
    const puesto = await PuestoTrabajo.findById(req.params.id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    puesto.peluquero = peluqueroId;
    await puesto.save();

    res.json({ message: 'Peluquero asignado al puesto correctamente' });
  } catch (error) {
    console.error('❌ Error asignando puesto:', error);
    res.status(500).json({ message: 'Error asignando puesto' });
  }
};

module.exports = {
  obtenerPuestos,
  liberarPuesto,
  asignarPuesto
};
