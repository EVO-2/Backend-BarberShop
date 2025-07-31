const Peluquero = require('../models/Peluquero.model');

// =========================
// Validación única sede + puesto
// =========================
const validarAsignacionUnica = async (sedeId, puestoId) => {
  const existente = await Peluquero.findOne({
    sede: sedeId,
    puestoTrabajo: puestoId,
    estado: true
  });
  return !!existente; // true si ya existe, false si libre
};

// =========================
// Crear peluquero
// =========================
const crearPeluquero = async (req, res) => {
  try {
    const { usuario, sede, puestoTrabajo, ...resto } = req.body;

    const ocupado = await validarAsignacionUnica(sede, puestoTrabajo);
    if (ocupado) {
      return res.status(400).json({
        msg: 'Ya existe un peluquero asignado a esa sede y puesto de trabajo.'
      });
    }

    const nuevoPeluquero = new Peluquero({
      usuario,
      sede,
      puestoTrabajo,
      ...resto
    });

    await nuevoPeluquero.save();

    res.status(201).json(nuevoPeluquero);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al crear el peluquero.' });
  }
};

const actualizarPeluquero = async (req, res) => {
  try {
    const { id } = req.params;
    const { sede, puestoTrabajo, usuario, ...resto } = req.body;

    // Verifica si el peluquero existe
    const peluquero = await Peluquero.findById(id);
    if (!peluquero || !peluquero.estado) {
      return res.status(404).json({ msg: 'Peluquero no encontrado o inactivo' });
    }

    // Validar si se cambia sede o puestoTrabajo
    const cambioDeAsignacion = (sede && sede != peluquero.sede?.toString()) || (puestoTrabajo && puestoTrabajo != peluquero.puestoTrabajo?.toString());

    if (cambioDeAsignacion) {
      const ocupado = await validarAsignacionUnica(sede || peluquero.sede, puestoTrabajo || peluquero.puestoTrabajo);
      if (ocupado && ocupado._id.toString() !== id) {
        return res.status(400).json({
          msg: 'Ya hay un peluquero asignado a esa sede y puesto de trabajo.'
        });
      }
    }

    peluquero.set({
      sede: sede ?? peluquero.sede,
      puestoTrabajo: puestoTrabajo ?? peluquero.puestoTrabajo,
      ...resto
    });

    await peluquero.save();

    res.json(peluquero);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al actualizar el peluquero.' });
  }
};


module.exports = {
  crearPeluquero,
  actualizarPeluquero
};
