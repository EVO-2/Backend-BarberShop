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
async function calcularDuracionTotal(serviciosIds = []) {
  if (!Array.isArray(serviciosIds) || serviciosIds.length === 0) return 0;

  const validIds = serviciosIds.filter(id => id && typeof id === 'string');
  const servicios = await Servicio.find({ _id: { $in: validIds }, estado: true }).lean();

  if (servicios.length !== validIds.length) {
    throw { status: 400, message: 'Uno o más servicios no existen o están inactivos' };
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

  return await Cita.exists(filtro);
}

async function validarReferencias({ cliente, peluquero, sede, puestoTrabajo }) {
  const promesas = [
    Cliente.findById(cliente).lean(),
    Sede.findOne({ _id: sede, estado: true }).lean()
  ];

  if (peluquero) promesas.push(Peluquero.findById(peluquero).lean());
  if (puestoTrabajo) promesas.push(PuestoTrabajo.findOne({ _id: puestoTrabajo, estado: true }).lean());

  const [cli, sed, pel, puesto] = await Promise.all(promesas);

  if (!cli) throw { status: 400, message: 'Cliente no válido' };
  if (!sed) throw { status: 400, message: 'Sede no válida o inactiva' };
  if (peluquero && !pel) throw { status: 400, message: 'Peluquero no válido' };
  if (puestoTrabajo && !puesto) throw { status: 400, message: 'Puesto de trabajo no válido o inactivo' };
  if (puestoTrabajo && puesto.sede?.toString() !== sede.toString()) {
    throw { status: 400, message: 'El puesto de trabajo no pertenece a la sede seleccionada' };
  }
}

// ===================== servicios =====================
const crearCita = async ({ 
  cliente, 
  peluquero, 
  servicios = [], 
  sede, 
  puestoTrabajo, 
  fecha, 
  observacion 
}) => {
  if (!cliente || !sede || !fecha) {
    throw { status: 400, message: 'cliente, sede y fecha son obligatorios' };
  }

  await validarReferencias({ cliente, peluquero, sede, puestoTrabajo });

  const duracionMin = await calcularDuracionTotal(servicios);
  const fechaInicio = new Date(fecha);
  const fechaFin = new Date(fechaInicio.getTime() + (duracionMin || 30) * 60 * 1000);

  const haySolape = await existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin });
  if (haySolape) throw { status: 400, message: 'Horario no disponible (solapado con otra cita)' };

  const inicioDia = new Date(fechaInicio); inicioDia.setHours(0,0,0,0);
  const finDia = new Date(fechaInicio); finDia.setHours(23,59,59,999);

  const ultimoTurno = await Cita.find({ sede, fechaInicio: { $gte: inicioDia, $lte: finDia } })
    .sort({ turno: -1 })
    .limit(1);

  const turno = (ultimoTurno[0]?.turno || 0) + 1;

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
    observacion: observacion || null,
    turno,
    estado: 'pendiente',
  });

  return Cita.findById(nuevaCita._id).populate(CITA_POPULATE);
};

const obtenerCitas = async () => {
  return await Cita.find().populate(CITA_POPULATE).lean();
};

// ===================== obtenerCitasPaginadas =====================
const obtenerCitasPaginadas = async ({ page = 1, limit = 10, filtroGeneral, fecha }) => {
  page = Math.max(1, Number(page) || 1);
  limit = Math.max(1, Number(limit) || 10);
  const skip = (page - 1) * limit;

  let match = {};

  if (fecha && fecha.inicio && fecha.fin) {
    const inicio = new Date(fecha.inicio);
    const fin = new Date(fecha.fin);
    if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime())) {
      fin.setHours(23, 59, 59, 999);
      match.fecha = { $gte: inicio, $lte: fin };
    }
  }

  if (filtroGeneral && filtroGeneral.trim() !== '') {
    const palabras = filtroGeneral.trim().split(/\s+/);
    match.$and = palabras.map(palabra => {
      const regex = new RegExp(palabra, 'i');
      const isNumber = !isNaN(Number(palabra));
      const isDateFull = /^\d{4}-\d{2}-\d{2}$/.test(palabra);
      const isDateMonth = /^\d{4}-\d{2}$/.test(palabra);

      if (isDateFull) {
        const fechaInicio = new Date(palabra);
        const fechaFin = new Date(palabra);
        fechaFin.setDate(fechaFin.getDate() + 1);
        return { fecha: { $gte: fechaInicio, $lt: fechaFin } };
      }

      if (isDateMonth) {
        const [year, month] = palabra.split('-').map(Number);
        const fechaInicio = new Date(year, month - 1, 1);
        const fechaFin = new Date(year, month, 1);
        return { fecha: { $gte: fechaInicio, $lt: fechaFin } };
      }

      return {
        $or: [
          { 'clienteUsuario.nombre': regex },
          { 'clienteUsuario.apellido': regex },
          { 'peluqueroUsuario.nombre': regex },
          { 'peluqueroUsuario.apellido': regex },
          { 'sede.nombre': regex },
          { 'servicios.nombre': regex },
          { estado: regex },
          ...(isNumber ? [{ turno: Number(palabra) }] : [])
        ]
      };
    });
  }

  const pipeline = [
    { $lookup: { from: 'clientes', localField: 'cliente', foreignField: '_id', as: 'cliente' } },
    { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'usuarios', localField: 'cliente.usuario', foreignField: '_id', as: 'clienteUsuario' } },
    { $unwind: { path: '$clienteUsuario', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'peluqueros', localField: 'peluquero', foreignField: '_id', as: 'peluquero' } },
    { $unwind: { path: '$peluquero', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'usuarios', localField: 'peluquero.usuario', foreignField: '_id', as: 'peluqueroUsuario' } },
    { $unwind: { path: '$peluqueroUsuario', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'sedes', localField: 'sede', foreignField: '_id', as: 'sede' } },
    { $unwind: { path: '$sede', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'servicios', localField: 'servicios', foreignField: '_id', as: 'servicios' } },
    { $lookup: { from: 'puestotrabajos', localField: 'puestoTrabajo', foreignField: '_id', as: 'puestoTrabajo' } },
    { $unwind: { path: '$puestoTrabajo', preserveNullAndEmptyArrays: true } },
    { $match: match },
    { $sort: { fecha: -1 } }
  ];

  const totalResult = await Cita.aggregate([...pipeline, { $count: 'total' }]);
  const total = totalResult.length > 0 ? totalResult[0].total : 0;

  const citasRaw = await Cita.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]);

  const citas = citasRaw.map(c => ({
    ...c,
    cliente: { ...c.cliente, usuario: c.clienteUsuario },
    peluquero: { ...c.peluquero, usuario: c.peluqueroUsuario },
    servicios: c.servicios?.map(s => ({ _id: s._id, nombre: s.nombre })) || [],
    duracionRealMin: c.duracionRealMin || 0
  }));

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    citas
  };
};

// ===================== obtenerMisCitas =====================
const obtenerMisCitas = async ({ uid, rol, fecha, filtroGeneral, page = 1, limit = 10 }) => {
  page = Math.max(1, Number(page) || 1);
  limit = Math.max(1, Number(limit) || 10);
  const skip = (page - 1) * limit;

  const match = {};

  if (rol === 'cliente') {
    const cliente = await Cliente.findOne({ usuario: uid }).lean();
    if (!cliente) throw { status: 404, message: 'Cliente no encontrado' };
    match.cliente = cliente._id;
  } else if (rol === 'barbero') {
    const peluquero = await Peluquero.findOne({ usuario: uid }).lean();
    if (!peluquero) throw { status: 404, message: 'Peluquero no encontrado' };
    match.peluquero = peluquero._id;
  }

  if (fecha && fecha.inicio && fecha.fin) {
    const inicio = new Date(fecha.inicio);
    const fin = new Date(fecha.fin);
    if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime())) {
      fin.setHours(23, 59, 59, 999);
      match.fecha = { $gte: inicio, $lte: fin };
    }
  }

  const pipeline = [
    { $match: match },
    { $lookup: { from: 'clientes', localField: 'cliente', foreignField: '_id', as: 'cliente' } },
    { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'usuarios', localField: 'cliente.usuario', foreignField: '_id', as: 'cliente.usuario' } },
    { $unwind: { path: '$cliente.usuario', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'peluqueros', localField: 'peluquero', foreignField: '_id', as: 'peluquero' } },
    { $unwind: { path: '$peluquero', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'usuarios', localField: 'peluquero.usuario', foreignField: '_id', as: 'peluquero.usuario' } },
    { $unwind: { path: '$peluquero.usuario', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'sedes', localField: 'sede', foreignField: '_id', as: 'sede' } },
    { $unwind: { path: '$sede', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'servicios', localField: 'servicios', foreignField: '_id', as: 'servicios' } },
    { $group: { _id: "$_id", doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
  ];

  if (filtroGeneral && filtroGeneral.trim() !== '') {
    const palabras = filtroGeneral.trim().split(/\s+/);
    const regexPalabras = palabras.map(p => new RegExp(p, 'i'));
    pipeline.push({
      $match: {
        $and: regexPalabras.map(regex => ({}))
      }
    });
  }

  pipeline.push(
    { $sort: { fecha: -1, turno: 1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }]
      }
    }
  );

  const resultado = await Cita.aggregate(pipeline);

  return {
    total: resultado[0]?.totalCount[0]?.count || 0,
    page,
    totalPages: Math.ceil((resultado[0]?.totalCount[0]?.count || 0) / limit),
    citas: resultado[0]?.data || []
  };
};

// ===================== funciones restantes =====================
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
  if (haySolape) throw { status: 400, message: 'Horario no disponible (solapado con otra cita)' };

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
  return await Cita.findById(id).populate(CITA_POPULATE);
};

const calcularDuracionReal = (inicioServicio, finServicio) => {
  const inicio = new Date(inicioServicio).getTime();
  const fin = new Date(finServicio).getTime();
  if (isNaN(inicio) || isNaN(fin) || fin <= inicio) return 0;
  return Math.round((fin - inicio) / 60000);
};

const iniciarCita = async (id, hora) => {
  const cita = await Cita.findById(id).populate('servicios');
  if (!cita) throw { status: 404, message: 'Cita no encontrada' };
  if (!['pendiente', 'confirmada'].includes(cita.estado)) {
    throw { status: 400, message: 'Solo citas pendientes o confirmadas pueden iniciarse' };
  }
  const inicio = hora ? new Date(`1970-01-01T${hora}:00`) : new Date();
  cita.inicioServicio = inicio;
  cita.estado = 'en_proceso';
  await cita.save();
  return Cita.findById(id).populate(CITA_POPULATE);
};

const finalizarCita = async (id, hora) => {
  const cita = await Cita.findById(id).populate('servicios');
  if (!cita) throw { status: 404, message: 'Cita no encontrada' };
  if (cita.estado !== 'en_proceso') throw { status: 400, message: 'La cita no está en proceso y no puede finalizarse' };

  let fechaFin;
  if (hora && cita.inicioServicio) {
    const [horas, minutos] = hora.split(':').map(Number);
    if (isNaN(horas) || isNaN(minutos)) throw { status: 400, message: 'Formato de hora inválido' };
    fechaFin = new Date(cita.inicioServicio);
    fechaFin.setHours(horas, minutos, 0, 0);
  } else {
    fechaFin = new Date();
  }

  cita.finServicio = fechaFin;
  cita.duracionRealMin = calcularDuracionReal(cita.inicioServicio, fechaFin);
  cita.estado = 'finalizada';
  await cita.save();

  return Cita.findById(id).populate(CITA_POPULATE);
};

const cancelarCita = async (id) => {
  const cita = await Cita.findById(id);
  if (!cita) throw { status: 404, message: 'Cita no encontrada' };
  if (['en_proceso', 'finalizada', 'cancelada'].includes(cita.estado)) {
    throw { status: 400, message: 'Solo se pueden cancelar citas pendientes o confirmadas' };
  }
  cita.estado = 'cancelada';
  await cita.save();
  return Cita.findById(id).populate(CITA_POPULATE);
};

const getCitasPorSedeYFecha = async ({ sedeId, fecha }) => {
  if (!sedeId || !fecha) throw { status: 400, message: 'sedeId y fecha son obligatorios' };
  const fechaInicio = new Date(fecha); fechaInicio.setHours(0,0,0,0);
  const fechaFin = new Date(fecha); fechaFin.setHours(23,59,59,999);

  return await Cita.find({
    sede: sedeId,
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $lt: fechaFin },
    fechaFin: { $gt: fechaInicio },
  }).populate(CITA_POPULATE).lean();
};

const obtenerCitasPorFechaYHora = async ({ fecha, hora }) => {
  if (!fecha || !hora) throw { status: 400, message: 'fecha y hora son obligatorios' };
  const fechaHora = new Date(`${fecha}T${hora}:00`);
  const fechaHoraFin = new Date(fechaHora);
  fechaHoraFin.setMinutes(fechaHora.getMinutes() + 59, 59, 999);

  return await Cita.find({
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $lt: fechaHoraFin },
    fechaFin: { $gt: fechaHora },
  }).populate(CITA_POPULATE).lean();
};

const repetirCita = async ({ id, fecha }) => {
  if (!fecha) throw { status: 400, message: 'Fecha es obligatoria' };
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
  if (haySolape) throw { status: 400, message: 'Horario no disponible (solapado con otra cita)' };

  const turno = await Cita.find({ sede: citaOriginal.sede }).sort({ turno: -1 }).limit(1)
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

const obtenerCitasPorRango = async ({ fechaInicio, fechaFin }) => {
  if (!fechaInicio || !fechaFin) throw { status: 400, message: 'Se requieren fechaInicio y fechaFin' };
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin); fin.setHours(23,59,59,999);

  return await Cita.find({
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $gte: inicio },
    fechaFin: { $lte: fin }
  }).populate(CITA_POPULATE).lean();
};

const pagarCita = async ({ id, monto, metodo }) => {
  if (!monto || !metodo) throw { status: 400, message: 'Monto y método de pago son obligatorios' };

  const cita = await Cita.findById(id);
  if (!cita) throw { status: 404, message: 'Cita no encontrada' };
  if (cita.estado === 'cancelada') throw { status: 400, message: 'No se puede pagar una cita cancelada' };
  if (cita.pago) throw { status: 400, message: 'La cita ya tiene un pago asociado' };

  const pago = await Pago.create({
    cita: cita._id,
    monto,
    metodo,
    estado: 'completado',
    fecha: new Date()
  });

  cita.pago = pago._id;
  cita.estado = 'pagada';
  await cita.save();

  return Cita.findById(cita._id).populate(CITA_POPULATE);
};

// ===================== export =====================
module.exports = {
  crearCita,
  obtenerCitas,
  obtenerCitasPaginadas,
  obtenerMisCitas,
  obtenerCitaPorId,
  actualizarCita,
  calcularDuracionReal,
  iniciarCita,   
  finalizarCita, 
  cancelarCita,  
  getCitasPorSedeYFecha,
  obtenerCitasPorFechaYHora,
  repetirCita,
  obtenerCitasPorRango,
  pagarCita
};
