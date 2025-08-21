// src/services/cita.service.js

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
// ✔ Función para calcular duración total de servicios
async function calcularDuracionTotal(serviciosIds = []) {
  if (!Array.isArray(serviciosIds) || serviciosIds.length === 0) return 0;

  // Convertir solo IDs válidos
  const validIds = serviciosIds.filter(id => id && typeof id === 'string');

  const servicios = await Servicio.find({ _id: { $in: validIds }, estado: true }).lean();
  if (servicios.length !== validIds.length) {
    throw new Error('Uno o más servicios no existen o están inactivos');
  }

  return servicios.reduce((acc, s) => acc + (s.duracion || 0), 0);
}

async function existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin, excluirId = null }) {
  const filtro = {
    sede,
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $lt: fechaFin },
    fechaFin: { $gt: fechaInicio },
    ...(excluirId && { _id: { $ne: excluirId } }),
    ...(peluquero || puestoTrabajo ? { $or: [] } : {})
  };

  if (peluquero) filtro.$or.push({ peluquero });
  if (puestoTrabajo) filtro.$or.push({ puestoTrabajo });

  if (filtro.$or && filtro.$or.length === 0) delete filtro.$or;

  return Cita.exists(filtro);
}

async function validarReferencias({ cliente, peluquero, sede, puestoTrabajo }) {
  const promesas = [
    Cliente.findById(cliente).lean(),
    Sede.findOne({ _id: sede, estado: true }).lean()
  ];

  if (peluquero) promesas.push(Peluquero.findById(peluquero).lean());
  if (puestoTrabajo) promesas.push(PuestoTrabajo.findOne({ _id: puestoTrabajo, estado: true }).lean());

  const resultados = await Promise.all(promesas);
  const [cli, sed, pel, puesto] = resultados;

  if (!cli) throw new Error('Cliente no válido');
  if (!sed) throw new Error('Sede no válida o inactiva');
  if (peluquero && !pel) throw new Error('Peluquero no válido');
  if (puestoTrabajo && !puesto) throw new Error('Puesto de trabajo no válido o inactivo');

  if (puestoTrabajo && puesto.sede?.toString() !== sede.toString()) {
    throw new Error('El puesto de trabajo no pertenece a la sede seleccionada');
  }
}


// ===================== servicios =====================
const crearCita = async ({ cliente, peluquero, servicios = [], sede, puestoTrabajo, fecha }) => {
  if (!cliente || !sede || !fecha) throw new Error('cliente, sede y fecha son obligatorios');

  await validarReferencias({ cliente, peluquero, sede, puestoTrabajo });

  const duracionMin = await calcularDuracionTotal(servicios);
  const fechaInicio = new Date(fecha);
  const fechaFin = new Date(fechaInicio.getTime() + (duracionMin || 30) * 60 * 1000);

  const haySolape = await existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin });
  if (haySolape) throw new Error('Horario no disponible (solapado con otra cita)');

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

  return Cita.findById(nuevaCita._id).populate(CITA_POPULATE);
};

const obtenerCitas = async () => {
  return Cita.find().populate(CITA_POPULATE).lean();
};

const obtenerMisCitas = async ({ uid, rol, fecha, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  let filtro = {};

  if (rol === 'cliente') {
    const cliente = await Cliente.findOne({ usuario: uid }).lean();
    if (!cliente) throw { status: 404, message: 'Cliente no encontrado' };
    filtro.cliente = cliente._id;
  } else if (rol === 'barbero') {
    const peluquero = await Peluquero.findOne({ usuario: uid }).lean();
    if (!peluquero) throw { status: 404, message: 'Peluquero no encontrado' };
    filtro.peluquero = peluquero._id;
  }

  if (fecha) {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
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

  return { total, page, totalPages: Math.ceil(total / limit), citas };
};

const obtenerCitaPorId = async (id) => {
  const cita = await Cita.findById(id).populate(CITA_POPULATE).lean();
  if (!cita) throw { status: 404, message: 'Cita no encontrada' };
  return cita;
};

const actualizarCita = async ({ id, data }) => {
  const { servicios, sede, puestoTrabajo, peluquero, fecha, observaciones } = data;
  const citaBase = await Cita.findById(id).lean();
  if (!citaBase) throw { status: 404, message: 'Cita no encontrada' };

  if (sede || puestoTrabajo || peluquero || servicios) {
    await validarReferencias({
      cliente: data.cliente || citaBase.cliente,
      peluquero: peluquero ?? citaBase.peluquero,
      sede: sede ?? citaBase.sede,
      puestoTrabajo: puestoTrabajo ?? citaBase.puestoTrabajo,
    });
  }

  let fechaInicio = fecha ? new Date(fecha) : new Date(citaBase.fechaInicio);
  let fechaFin = citaBase.fechaFin;
  if (servicios) {
    const duracion = await calcularDuracionTotal(servicios);
    fechaFin = new Date(fechaInicio.getTime() + (duracion || 30) * 60 * 1000);
  }

  const haySolape = await existeSolape({
    sede: sede ?? citaBase.sede,
    peluquero: peluquero ?? citaBase.peluquero,
    puestoTrabajo: puestoTrabajo ?? citaBase.puestoTrabajo,
    fechaInicio,
    fechaFin,
    excluirId: id,
  });
  if (haySolape) throw new Error('Horario no disponible (solapado con otra cita)');

  const updateData = {
    sede: sede ?? citaBase.sede,
    peluquero: peluquero ?? citaBase.peluquero,
    puestoTrabajo: puestoTrabajo ?? citaBase.puestoTrabajo,
    servicios: servicios ?? citaBase.servicios,
    fechaInicio,
    fechaFin,
    observaciones: observaciones ?? citaBase.observaciones
  };

  await Cita.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  return Cita.findById(id).populate(CITA_POPULATE);
};

const cancelarCita = async (id) => {
  const citaCancelada = await Cita.findByIdAndUpdate(id, { estado: 'cancelada' }, { new: true })
    .populate(CITA_POPULATE);
  if (!citaCancelada) throw { status: 404, message: 'Cita no encontrada' };
  return citaCancelada;
};

const finalizarCita = async (id) => {
  const cita = await Cita.findById(id);
  if (!cita) throw { status: 404, message: 'Cita no encontrada' };
  if (!ESTADOS_ACTIVOS.includes(cita.estado)) throw new Error('Solo citas activas pueden finalizarse');

  cita.estado = 'finalizada';
  await cita.save();
  return Cita.findById(id).populate(CITA_POPULATE);
};

const getCitasPorSedeYFecha = async ({ sedeId, fecha }) => {
  if (!sedeId || !fecha) throw new Error('sedeId y fecha son obligatorios');
  const fechaInicio = new Date(fecha); fechaInicio.setHours(0,0,0,0);
  const fechaFin = new Date(fecha); fechaFin.setHours(23,59,59,999);

  return Cita.find({
    sede: sedeId,
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $lt: fechaFin },
    fechaFin: { $gt: fechaInicio },
  }).populate(CITA_POPULATE).lean();
};

const obtenerCitasPorFechaYHora = async ({ fecha, hora }) => {
  if (!fecha || !hora) throw new Error('fecha y hora son obligatorios');
  const fechaHora = new Date(`${fecha}T${hora}:00`);
  const fechaHoraFin = new Date(fechaHora);
  fechaHoraFin.setMinutes(fechaHora.getMinutes() + 59, 59, 999);

  return Cita.find({
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $lt: fechaHoraFin },
    fechaFin: { $gt: fechaHora },
  }).populate(CITA_POPULATE).lean();
};

const repetirCita = async ({ id, fecha }) => {
  if (!fecha) throw new Error('Fecha es obligatoria');

  const citaOriginal = await Cita.findById(id).lean();
  if (!citaOriginal) throw { status: 404, message: 'Cita original no encontrada' };

  await validarReferencias({
    cliente: citaOriginal.cliente,
    peluquero: citaOriginal.peluquero,
    sede: citaOriginal.sede,
    puestoTrabajo: citaOriginal.puestoTrabajo
  });

  const duracionMin = await calcularDuracionTotal(citaOriginal.servicios);
  const fechaInicio = new Date(fecha);
  const fechaFin = new Date(fechaInicio.getTime() + (duracionMin || 30) * 60 * 1000);

  const haySolape = await existeSolape({
    sede: citaOriginal.sede,
    peluquero: citaOriginal.peluquero,
    puestoTrabajo: citaOriginal.puestoTrabajo,
    fechaInicio,
    fechaFin
  });
  if (haySolape) throw new Error('Horario no disponible (solapado con otra cita)');

  const turno = await Cita.find({ sede: citaOriginal.sede })
    .sort({ turno: -1 })
    .limit(1)
    .then(r => (r[0]?.turno || 0) + 1);

  const nuevaCita = await Cita.create({
    cliente: citaOriginal.cliente,
    peluquero: citaOriginal.peluquero,
    sede: citaOriginal.sede,
    puestoTrabajo: citaOriginal.puestoTrabajo,
    servicios: citaOriginal.servicios,
    fechaInicio,
    fechaFin,
    fechaBase: fechaInicio.toISOString(),
    turno,
    estado: 'pendiente'
  });

  return Cita.findById(nuevaCita._id).populate(CITA_POPULATE);
};

// ===================== NUEVA FUNCION: obtenerCitasPorRango =====================
const obtenerCitasPorRango = async ({ fechaInicio, fechaFin }) => {
  if (!fechaInicio || !fechaFin) throw new Error('Se requieren fechaInicio y fechaFin');
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);
  fin.setHours(23,59,59,999);

  return Cita.find({
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $gte: inicio },
    fechaFin: { $lte: fin }
  }).populate(CITA_POPULATE).lean();
};

// ===================== export =====================
module.exports = {
  crearCita,
  obtenerCitas,
  obtenerMisCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  finalizarCita,
  getCitasPorSedeYFecha,
  obtenerCitasPorFechaYHora,
  repetirCita,
  obtenerCitasPorRango 
};
