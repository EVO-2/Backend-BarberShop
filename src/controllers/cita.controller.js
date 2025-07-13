
// ⚠️  Estos require SOLO registran los modelos; no devuelven nada que uses aquí
require('../models/Cliente.model');
require('../models/Peluquero.model');
require('../models/Servicio.model');
const Cita = require('../models/Cita.model');

// Crear una nueva cita
const crearCita = async (req, res) => {
  try {
    const { cliente, peluquero, servicios, fecha, observaciones } = req.body;

    // Validar servicios activos
    const serviciosValidos = await Servicio.find({
      _id: { $in: servicios },
      estado: true
    });

    if (serviciosValidos.length !== servicios.length) {
      return res.status(400).json({
        mensaje: 'Uno o más servicios no existen o están inactivos'
      });
    }

    // Calcular turno
    const inicioDelDia = new Date(fecha);
    inicioDelDia.setHours(0, 0, 0, 0);
    const finDelDia = new Date(fecha);
    finDelDia.setHours(23, 59, 59, 999);

    const citasDelDia = await Cita.countDocuments({
      peluquero,
      fecha: { $gte: inicioDelDia, $lte: finDelDia }
    });

    const nuevoTurno = citasDelDia + 1;

    const nuevaCita = await Cita.create({
      cliente,
      peluquero,
      servicios,
      fecha,
      turno: nuevoTurno,
      observaciones
    });

    res.status(201).json(nuevaCita);
  } catch (error) {
    console.error('❌ Error al crear cita:', error);
    res.status(500).json({ mensaje: 'Error al reservar la cita' });
  }
};


// Obtener todas las citas
const obtenerCitas = async (req, res) => {
  try {
    const citas = await Cita.find()
      .populate('cliente', 'usuario')
      .populate('peluquero', 'usuario')
      .populate('servicios');
    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// Obtener una cita por ID
const obtenerCitaPorId = async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate('cliente')
      .populate('peluquero')
      .populate('servicios');

    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json(cita);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al buscar la cita' });
  }
};

// Actualizar una cita (por ejemplo estado o fecha)
const actualizarCita = async (req, res) => {
  try {
    const { servicios } = req.body;

    // Validar servicios si vienen en la petición
    if (servicios && servicios.length > 0) {
      const serviciosValidos = await Servicio.find({
        _id: { $in: servicios },
        estado: true
      });

      if (serviciosValidos.length !== servicios.length) {
        return res.status(400).json({
          mensaje: 'Uno o más servicios no existen o están inactivos'
        });
      }
    }

    const cita = await Cita.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    });

    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json(cita);
  } catch (error) {
    console.error('❌ Error al actualizar la cita:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la cita' });
  }
};


// Cancelar (marcar como cancelada) una cita
const cancelarCita = async (req, res) => {
  try {
    const cita = await Cita.findByIdAndUpdate(
      req.params.id,
      { estado: 'cancelada' },
      { new: true }
    );

    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }

    res.json({ mensaje: 'Cita cancelada exitosamente', cita });
  } catch (error) {
    console.error('❌ Error al cancelar la cita:', error);
    res.status(500).json({ mensaje: 'Error al cancelar la cita' });
  }
};


module.exports = {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita
};
