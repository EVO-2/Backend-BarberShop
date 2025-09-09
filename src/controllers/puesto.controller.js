// controllers/puesto.controller.js
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');

// =============================
// GET /api/puestos/por-sede/:sedeId
// =============================
const obtenerPuestos = async (req, res) => {
  try {
    const { sedeId } = req.params;
    let { peluquero_id, usuario_id } = req.query;

    if (!sedeId) {
      return res.status(400).json({ message: 'El parámetro sedeId es obligatorio' });
    }

    // Resolver usuario_id -> peluquero_id
    if (usuario_id && !peluquero_id) {
      const peluqueroDoc = await Peluquero.findOne({ usuario: usuario_id });
      peluquero_id = peluqueroDoc?._id?.toString();
    }

    const puestos = await PuestoTrabajo.find({ sede: sedeId, estado: true })
      .populate('sede', 'nombre')
      .populate({
        path: 'peluquero',
        select: '_id estado puestoTrabajo usuario',
        populate: {
          path: 'usuario',
          select: 'nombre apellido'
        }
      });

    // ========== MODO CREAR ==========
    if (!peluquero_id) {
      const puestosLibres = puestos
        .filter(p => !p.peluquero || !p.peluquero._id)
        .map(p => ({
          _id: p._id,
          nombre: p.nombre,
          sede: p.sede,
          ocupado: false
        }));

      return res.json(puestosLibres);
    }

    // ========== MODO EDICIÓN ==========
    const peluquero = await Peluquero.findById(peluquero_id).populate('puestoTrabajo');
    const puestoActualId = peluquero?.puestoTrabajo?._id?.toString();

    const puestosDisponibles = puestos.map(p => {
      const esMismoPuesto = p._id.toString() === puestoActualId;
      const peluqueroActivo = Boolean(p.peluquero && p.peluquero.estado === true);
      const ocupado = peluqueroActivo && !esMismoPuesto;

      return {
        _id: p._id,
        nombre: p.nombre,
        sede: p.sede,
        ocupado
      };
    });

    // Asegurar que el puesto actual del peluquero esté incluido
    if (puestoActualId && !puestosDisponibles.find(p => p._id.toString() === puestoActualId)) {
      puestosDisponibles.push({
        _id: puestoActualId,
        nombre: peluquero.puestoTrabajo.nombre,
        sede: peluquero.puestoTrabajo.sede,
        ocupado: false
      });
    }

    return res.json(puestosDisponibles);
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// =============================
// PUT /api/puestos/:id/asignar
// =============================
// Asigna un peluquero a un puesto y libera el puesto anterior automáticamente
const asignarPuesto = async (req, res) => {
  try {
    const { peluqueroId } = req.body;
    const puesto = await PuestoTrabajo.findById(req.params.id).populate('sede');
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    const peluquero = await Peluquero.findById(peluqueroId).populate('puestoTrabajo');
    if (!peluquero) return res.status(404).json({ message: 'Peluquero no encontrado' });

    // Validación: el puesto debe pertenecer a la misma sede que el peluquero (si ya tenía puesto asignado)
    const sedeActual = peluquero.puestoTrabajo?.sede?.toString();
    if (sedeActual && puesto.sede._id.toString() !== sedeActual) {
      return res.status(400).json({
        message: 'El puesto seleccionado no pertenece a la misma sede del peluquero'
      });
    }

    // Si el peluquero ya tenía un puesto diferente, liberarlo
    const puestoAnterior = peluquero.puestoTrabajo?._id?.toString();
    if (puestoAnterior && puestoAnterior !== puesto._id.toString()) {
      await PuestoTrabajo.findByIdAndUpdate(puestoAnterior, { peluquero: null });
    }

    // Asignar el nuevo puesto
    puesto.peluquero = peluquero._id;
    await puesto.save();

    peluquero.puestoTrabajo = puesto._id;
    await peluquero.save();

    res.json({ message: 'Peluquero reasignado correctamente', peluquero });
  } catch (error) {
    res.status(500).json({ message: 'Error asignando puesto' });
  }
};

// =============================
// PUT /api/puestos/:id/liberar
// =============================
const liberarPuesto = async (req, res) => {
  try {
    const puesto = await PuestoTrabajo.findById(req.params.id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    // Si tenía peluquero, desasociarlo también
    if (puesto.peluquero) {
      await Peluquero.findByIdAndUpdate(puesto.peluquero, { puestoTrabajo: null });
    }

    puesto.peluquero = null;
    await puesto.save();

    res.json({ message: 'Puesto liberado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error liberando puesto' });
  }
};

module.exports = {
  obtenerPuestos,
  asignarPuesto,
  liberarPuesto
};
