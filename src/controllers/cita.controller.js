// ===================== imports y registro de modelos =====================
const Cliente        = require('../models/Cliente.model');
const Peluquero      = require('../models/Peluquero.model');
const Servicio       = require('../models/Servicio.model');
const Sede           = require('../models/Sede.model');
const PuestoTrabajo  = require('../models/PuestoTrabajo.model');
const Pago           = require('../models/Pago.model');
const Cita           = require('../models/Cita.model');

// ===================== crear una nueva cita =============================
const crearCita = async (req, res) => {
  try {
    const { cliente, peluquero, fecha, sede, puestoTrabajo } = req.body;

    // Validar cita duplicada en misma fecha/hora/peluquero/sede
    const yaExiste = await Cita.findOne({ peluquero, fecha, sede });
    if (yaExiste) {
      return res.status(400).json({ msg: 'Ya existe una cita para ese peluquero en esa fecha y hora.' });
    }

    // Calcular turno: contar cuántas citas hay ese día en la sede
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const citasDelDia = await Cita.find({
      sede,
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    }).sort({ turno: 1 });

    const nuevoTurno = citasDelDia.length > 0
      ? citasDelDia[citasDelDia.length - 1].turno + 1
      : 1;

    // Crear cita
    const nuevaCita = await Cita.create({ ...req.body, turno: nuevoTurno });

    // Populate anidados correctamente
    const citaConDatos = await Cita.findById(nuevaCita._id)
      .populate({
        path: 'cliente',
        populate: {
          path: 'usuario',
          select: 'nombre correo'
        }
      })
      .populate({
        path: 'peluquero',
        populate: {
          path: 'usuario',
          select: 'nombre correo'
        }
      })
      .populate('servicios sede puestoTrabajo pago');

    // Log de depuración
    console.log('📌 Cita creada con datos anidados:\n', JSON.stringify(citaConDatos, null, 2));

    res.status(201).json(citaConDatos);
  } catch (error) {
    console.error('❌ Error al crear cita:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

module.exports = {
  crearCita
};


// ===================== obtener una cita por ID ===========================
const obtenerCitaPorId = async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate({ path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    res.json(cita);
  } catch (error) {
    console.error('❌ Error al buscar la cita:', error);
    res.status(500).json({ mensaje: 'Error al buscar la cita' });
  }
};

// ===================== actualizar una cita ===============================
const actualizarCita = async (req, res) => {
  try {
    const { servicios, sede, puestoTrabajo } = req.body;

    if (servicios) {
      const serviciosValidos = await Servicio.find({ _id: { $in: servicios }, estado: true });
      if (serviciosValidos.length !== servicios.length) {
        return res.status(400).json({ mensaje: 'Uno o más servicios no existen o están inactivos' });
      }
    }

    if (sede && !(await Sede.exists({ _id: sede, estado: true })))
      return res.status(400).json({ mensaje: 'Sede no válida o inactiva' });

    if (puestoTrabajo && !(await PuestoTrabajo.exists({ _id: puestoTrabajo, estado: true })))
      return res.status(400).json({ mensaje: 'Puesto de trabajo no válido o inactivo' });

    const citaActualizada = await Cita.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({ path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    if (!citaActualizada)
      return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json(citaActualizada);
  } catch (error) {
    console.error('❌ Error al actualizar la cita:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la cita' });
  }
};

// ===================== cancelar una cita ================================
const cancelarCita = async (req, res) => {
  try {
    const cita = await Cita.findByIdAndUpdate(
      req.params.id,
      { estado: 'cancelada' },
      { new: true }
    )
      .populate({ path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    if (!cita)
      return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json({ mensaje: 'Cita cancelada exitosamente', cita });
  } catch (error) {
    console.error('❌ Error al cancelar la cita:', error);
    res.status(500).json({ mensaje: 'Error al cancelar la cita' });
  }
};

// ===================== citas del cliente logueado ========================
const obtenerCitasDelCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ usuario: req.uid });
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const citas = await Cita.find({ cliente: cliente._id })
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' }
      })
      .populate({
        path: 'peluquero',
        populate: { path: 'usuario', select: 'nombre correo' }
      })
      .populate('servicios sede puestoTrabajo pago')
      .sort({ fecha: 1, hora: 1 });

    console.log('📌 Citas encontradas para el cliente logueado:');
    console.dir(citas, { depth: null });

    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas del cliente:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del cliente' });
  }
};


// ===================== citas del peluquero logueado ======================
const obtenerCitasDelPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findOne({ usuario: req.uid });
    if (!peluquero) return res.status(404).json({ mensaje: 'Peluquero no encontrado' });

    const citas = await Cita.find({ peluquero: peluquero._id })
      .populate({ path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas del peluquero:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del peluquero' });
  }
};

// ===================== obtener todas las citas ===========================
const obtenerCitas = async (_req, res) => {
  try {
    const citas = await Cita.find()
      .populate({ path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');
    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// ===================== obtener citas paginadas del usuario logueado ===========================
const listarMisCitas = async (req, res) => {
  try {
    const usuarioId = req.uid;
    const pagina = parseInt(req.query.pagina) || 1;
    const limite = parseInt(req.query.limite) || 10;
    const skip = (pagina - 1) * limite;

    // Buscar si es cliente o peluquero
    const cliente = await Cliente.findOne({ usuario: usuarioId });
    const peluquero = await Peluquero.findOne({ usuario: usuarioId });

    let filtro = {};
    if (cliente) {
      filtro = { cliente: cliente._id };
    } else if (peluquero) {
      filtro = { peluquero: peluquero._id };
    } else {
      return res.status(404).json({ mensaje: 'Usuario no registrado como cliente o peluquero' });
    }

    const total = await Cita.countDocuments(filtro);
    const citas = await Cita.find(filtro)
      .populate({ path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago')
      .sort({ fecha: -1, hora: -1 })
      .skip(skip)
      .limit(limite);

    const totalPaginas = Math.ceil(total / limite);

    res.json({ citas, total, totalPaginas });
  } catch (error) {
    console.error('❌ Error en listarMisCitas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del usuario' });
  }
};


// ===================== exports ==========================================
module.exports = {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  obtenerCitasDelCliente,
  obtenerCitasDelPeluquero,
  listarMisCitas
};
