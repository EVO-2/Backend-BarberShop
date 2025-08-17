// controllers/cita.controller.js

// ===================== imports =====================
const Cliente        = require('../models/Cliente.model');
const Peluquero      = require('../models/Peluquero.model');
const Servicio       = require('../models/Servicio.model');
const Sede           = require('../models/Sede.model');
const PuestoTrabajo  = require('../models/PuestoTrabajo.model');
const Pago           = require('../models/Pago.model');
const Cita           = require('../models/Cita.model');

const CITA_POPULATE = [
  {
    path: 'cliente',
    select: 'telefono direccion',
    populate: { path: 'usuario', select: 'nombre correo foto' },
  },
  {
    path: 'peluquero',
    populate: { path: 'usuario', select: 'nombre correo foto' },
  },
  { path: 'servicios', select: 'nombre precio duracion estado' },
  { path: 'sede', select: 'nombre direccion' },
  { path: 'puestoTrabajo', select: 'nombre' },
  { path: 'pago', select: 'monto metodo estado' },
];

const ESTADOS_ACTIVOS = ['pendiente', 'confirmada', 'en_proceso'];

// ===================== funciones auxiliares =====================

// Suma duración total en minutos
async function calcularDuracionTotal(serviciosIds = []) {
  if (!Array.isArray(serviciosIds) || serviciosIds.length === 0) return 0;
  const servicios = await Servicio.find({ _id: { $in: serviciosIds }, estado: true }).lean();
  if (servicios.length !== serviciosIds.length) {
    throw new Error('Uno o más servicios no existen o están inactivos');
  }
  return servicios.reduce((acc, s) => acc + (s.duracion || 0), 0);
}

// Verifica solape [inicio, fin) para peluquero y/o puesto en la sede
async function existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin, excluirId = null }) {
  const or = [];
  if (peluquero) or.push({ peluquero });
  if (puestoTrabajo) or.push({ puestoTrabajo });

  const base = {
    sede,
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $lt: fechaFin },
    fechaFin: { $gt: fechaInicio },
  };
  if (excluirId) base._id = { $ne: excluirId };
  const filtro = or.length ? { ...base, $or: or } : base;

  return Boolean(await Cita.exists(filtro));
}

// Validar referencias de cliente, peluquero, sede y puesto
async function validarReferencias({ cliente, peluquero, sede, puestoTrabajo }) {
  const [cli, sed] = await Promise.all([
    Cliente.findById(cliente).lean(),
    Sede.findOne({ _id: sede, estado: true }).lean()
  ]);
  if (!cli) throw new Error('Cliente no válido');
  if (!sed) throw new Error('Sede no válida o inactiva');

  if (peluquero) {
    const pel = await Peluquero.findById(peluquero).lean();
    if (!pel) throw new Error('Peluquero no válido');
  }

  if (puestoTrabajo) {
    const puesto = await PuestoTrabajo.findOne({ _id: puestoTrabajo, estado: true }).lean();
    if (!puesto) throw new Error('Puesto de trabajo no válido o inactivo');
    if (puesto.sede?.toString() !== sede.toString()) {
      throw new Error('El puesto de trabajo no pertenece a la sede seleccionada');
    }
  }
}

// ===================== controladores =====================

// Crear nueva cita
const crearCita = async (req, res) => {
  try {
    const { cliente, peluquero, servicios = [], sede, puestoTrabajo, fecha } = req.body;
    if (!cliente || !sede || !fecha) {
      return res.status(400).json({ mensaje: 'cliente, sede y fecha son obligatorios' });
    }

    await validarReferencias({ cliente, peluquero, sede, puestoTrabajo });

    const duracionMin = await calcularDuracionTotal(servicios);
    const fechaInicio = new Date(fecha);
    const fechaFin = new Date(fechaInicio.getTime() + (duracionMin || 30) * 60 * 1000);

    const haySolape = await existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin });
    if (haySolape) return res.status(400).json({ mensaje: 'Horario no disponible (solapado con otra cita)' });

    const turno = await Cita.find({ 
      sede, 
      fechaInicio: { $gte: new Date(fechaInicio.setHours(0,0,0,0)), $lte: new Date(fechaInicio.setHours(23,59,59,999)) } 
    })
      .sort({ turno: -1 })
      .limit(1)
      .then(r => (r[0]?.turno || 0) + 1);

    const nuevaCita = await Cita.create({
      cliente,
      peluquero: peluquero || null,
      servicios,
      sede,
      puestoTrabajo: puestoTrabajo || null,
      fechaInicio,
      fechaFin,
      fecha: fechaInicio.toISOString(),      
      fechaBase: fechaInicio.toISOString(),  
      turno,
      estado: 'pendiente',
    });

    const citaConDatos = await Cita.findById(nuevaCita._id).populate(CITA_POPULATE);
    return res.status(201).json(citaConDatos);
  } catch (error) {
    console.error('❌ Error al crear cita:', error);
    return res.status(500).json({ mensaje: error.message || 'Error interno del servidor' });
  }
};


// Obtener todas las citas
const obtenerCitas = async (_req, res) => {
  try {
    const citas = await Cita.find().populate(CITA_POPULATE).lean();
    return res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas:', error);
    return res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// Obtener citas del usuario logueado (cliente, barbero o admin)
const obtenerMisCitas = async (req, res) => {
  try {
    const { rol, uid } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let filtro = {};
    if (rol === 'cliente') {
      const cliente = await Cliente.findOne({ usuario: uid }).lean();
      if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
      filtro.cliente = cliente._id;
    } else if (rol === 'barbero') {
      const peluquero = await Peluquero.findOne({ usuario: uid }).lean();
      if (!peluquero) return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
      filtro.peluquero = peluquero._id;
    }

    // filtro opcional por fecha
    if (req.query.fecha) {
      const fechaInicio = new Date(req.query.fecha);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(req.query.fecha);
      fechaFin.setHours(23, 59, 59, 999);
      filtro.fechaInicio = { $gte: fechaInicio, $lte: fechaFin };
    }

    const total = await Cita.countDocuments(filtro);
    const citas = await Cita.find(filtro)
      .populate(CITA_POPULATE)
      .sort({ fechaInicio: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.json({
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit),
      citas
    });
  } catch (error) {
    console.error('❌ Error al obtenerMisCitas:', error);
    return res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// ===================== obtener una cita por ID ===========================
const obtenerCitaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await Cita.findById(id).populate(CITA_POPULATE).lean();
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    return res.json(cita);
  } catch (error) {
    console.error('❌ Error al obtenerCitaPorId:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la cita' });
  }
};

// ===================== actualizar una cita ===============================
const actualizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { servicios, sede, puestoTrabajo, peluquero, fecha } = req.body;

    // Verificar que la cita existe
    const citaBase = await Cita.findById(id).lean();
    if (!citaBase) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    // Validar referencias si se cambian
    if (sede || puestoTrabajo || peluquero || servicios) {
      await validarReferencias({
        cliente: req.body.cliente || citaBase.cliente,
        peluquero: peluquero ?? citaBase.peluquero,
        sede: sede ?? citaBase.sede,
        puestoTrabajo: puestoTrabajo ?? citaBase.puestoTrabajo,
      });
    }

    // Recalcular fechaFin si cambia fecha o servicios
    let fechaInicio = fecha ? new Date(fecha) : new Date(citaBase.fechaInicio);
    let fechaFin = fechaInicio;
    if (servicios) {
      const duracion = await calcularDuracionTotal(servicios);
      fechaFin = new Date(fechaInicio.getTime() + (duracion || 30) * 60 * 1000);
    } else {
      fechaFin = citaBase.fechaFin;
    }

    // Verificar solape
    const haySolape = await existeSolape({
      sede: sede ?? citaBase.sede,
      peluquero: peluquero ?? citaBase.peluquero,
      puestoTrabajo: puestoTrabajo ?? citaBase.puestoTrabajo,
      fechaInicio,
      fechaFin,
      excluirId: id,
    });
    if (haySolape) return res.status(400).json({ mensaje: 'Horario no disponible (solapado con otra cita)' });

    // Actualizar cita
    const updateData = { ...req.body, fechaInicio, fechaFin };
    const citaActualizada = await Cita.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate(CITA_POPULATE);

    return res.json(citaActualizada);
  } catch (error) {
    console.error('❌ Error al actualizarCita:', error);
    return res.status(500).json({ mensaje: error.message || 'Error al actualizar la cita' });
  }
};

// ===================== cancelar una cita ================================
const cancelarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const citaCancelada = await Cita.findByIdAndUpdate(id, { estado: 'cancelada' }, { new: true })
      .populate(CITA_POPULATE);

    if (!citaCancelada) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    return res.json({ mensaje: 'Cita cancelada exitosamente', cita: citaCancelada });
  } catch (error) {
    console.error('❌ Error al cancelarCita:', error);
    return res.status(500).json({ mensaje: 'Error al cancelar la cita' });
  }
};

// ===================== finalizar una cita =================================
const finalizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    // Solo citas activas pueden finalizarse
    if (!ESTADOS_ACTIVOS.includes(cita.estado)) {
      return res.status(400).json({ mensaje: 'Solo citas activas pueden finalizarse' });
    }

    cita.estado = 'finalizada';
    await cita.save();

    const citaFinalizada = await Cita.findById(id).populate(CITA_POPULATE);
    return res.json({ mensaje: 'Cita finalizada correctamente', cita: citaFinalizada });
  } catch (error) {
    console.error('❌ Error al finalizarCita:', error);
    return res.status(500).json({ mensaje: 'Error al finalizar la cita' });
  }
};


// Obtener citas por sede y fecha (candado dinámico)
const getCitasPorSedeYFecha = async (req, res) => {
  try {
    const { sedeId, fecha } = req.query;
    if (!sedeId || !fecha) {
      return res.status(400).json({ mensaje: 'sedeId y fecha son obligatorios' });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const citas = await Cita.find({
      sede: sedeId,
      estado: { $in: ESTADOS_ACTIVOS },
      fechaInicio: { $lt: fechaFin },
      fechaFin: { $gt: fechaInicio },
    }).populate(CITA_POPULATE).lean();

    res.json(citas);
  } catch (error) {
    console.error('❌ Error en getCitasPorSedeYFecha:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas por sede y fecha' });
  }
};

// ===================== exports =====================
module.exports = {
  crearCita,
  obtenerCitas,
  obtenerMisCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  finalizarCita,
  getCitasPorSedeYFecha,
};
