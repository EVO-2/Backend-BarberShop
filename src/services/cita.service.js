// ===================== imports ===================== 
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const Servicio = require('../models/Servicio.model');
const Sede = require('../models/Sede.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Pago = require('../models/Pago.model');
const Cita = require('../models/Cita.model');
const mongoose = require('mongoose');
const { EstadosPago, MetodosPago } = require('../constants');

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

// 🔹 Validación de solape de horarios
async function existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin, excluirId = null }) {
  const filtroBase = {
    sede,
    estado: { $in: ESTADOS_ACTIVOS }, // solo citas activas cuentan
    fechaInicio: { $lt: fechaFin },   // se solapan si inician antes de que termine la nueva
    fechaFin: { $gt: fechaInicio },   // y terminan después de que empiece la nueva
    ...(excluirId && { _id: { $ne: excluirId } })
  };

  // reglas de bloqueo: mismo peluquero o mismo puesto de trabajo
  const condiciones = [];
  if (peluquero) condiciones.push({ peluquero });
  if (puestoTrabajo) condiciones.push({ puestoTrabajo });

  // si hay peluquero o puesto, aplicamos OR
  if (condiciones.length > 0) {
    filtroBase.$or = condiciones;
  }

  return await Cita.exists(filtroBase);
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

  // validar que cliente, peluquero, sede y puestoTrabajo existan
  await validarReferencias({ cliente, peluquero, sede, puestoTrabajo });

  // calcular duración total de los servicios
  const duracionMin = await calcularDuracionTotal(servicios);
  const fechaInicio = new Date(fecha);
  const fechaFin = new Date(fechaInicio.getTime() + (duracionMin || 30) * 60 * 1000);

  // validar solapamiento de citas en sede/puesto/peluquero
  const haySolape = await existeSolape({ sede, peluquero, puestoTrabajo, fechaInicio, fechaFin });
  if (haySolape) throw { status: 400, message: 'Horario no disponible (solapado con otra cita)' };

  // rango del día (para buscar citas del peluquero ese día)
  const inicioDia = new Date(fechaInicio);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fechaInicio);
  finDia.setHours(23, 59, 59, 999);

  // fechaBase: día normalizado a las 00:00:00 (clave para agrupar)
  const fechaBase = new Date(fechaInicio);
  fechaBase.setHours(0, 0, 0, 0);

  // obtener último turno del peluquero para ese día
  const ultimoTurno = await Cita.findOne({
    peluquero: peluquero || null,
    fechaBase: { $gte: inicioDia, $lte: finDia }
  })
    .sort({ turno: -1 })
    .lean();

  // asignar turno correlativo al peluquero
  const turno = (ultimoTurno?.turno || 0) + 1;

  // crear cita
  const nuevaCita = await Cita.create({
    cliente,
    peluquero: peluquero || null,
    servicios,
    sede,
    puestoTrabajo: puestoTrabajo || null,
    fechaInicio,
    fechaFin,
    fecha: fechaInicio,
    fechaBase,
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
const obtenerCitasPaginadas = async ({ page = 1, limit = 10, filtroGeneral, fecha, rol, usuarioId }) => {
  page = Math.max(1, Number(page) || 1);
  limit = Math.max(1, Number(limit) || 10);
  const skip = (page - 1) * limit;

  const match = {};

  // ----------- Restricción por rol -----------
  if (rol === 'cliente') {
    throw { status: 403, message: 'Un cliente no tiene permisos para gestionar citas' };
  } else if (rol === 'peluquero' || rol === 'barbero') {
    const peluquero = await Peluquero.findOne({ usuario: usuarioId }).lean();
    if (!peluquero) throw { status: 404, message: 'Peluquero no encontrado' };
    match.peluquero = peluquero._id;
  }
  // admin → sin restricción (ve todas las citas)

  // ----------- Filtro por fecha -----------
  if (fecha && fecha.inicio && fecha.fin) {
    const inicio = new Date(fecha.inicio);
    const fin = new Date(fecha.fin);
    if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime())) {
      fin.setHours(23, 59, 59, 999);
      match.fecha = { $gte: inicio, $lte: fin };
    }
  }

  // ----------- Pipeline base -----------
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
  ];

  // ----------- Filtro general -----------
  if (filtroGeneral && filtroGeneral.trim() !== '') {
    const palabras = filtroGeneral.trim().split(/\s+/);
    const regexPalabras = palabras.map(p => new RegExp(p, 'i'));
    pipeline.push({
      $match: {
        $and: regexPalabras.map(regex => ({
          $or: [
            { 'cliente.usuario.nombre': regex },
            { 'cliente.usuario.apellido': regex },
            { 'peluquero.usuario.nombre': regex },
            { 'peluquero.usuario.apellido': regex },
            { 'sede.nombre': regex },
            { 'servicios.nombre': regex },
            { estado: regex },
            { turno: regex }
          ]
        }))
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
        $and: regexPalabras.map(regex => ({
          $or: [
            { 'cliente.usuario.nombre': regex },
            { 'peluquero.usuario.nombre': regex },
            { 'sede.nombre': regex },
            { 'servicios.nombre': regex },
            { estado: regex },
            { turno: regex }
          ]
        }))
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

  // Si se cambia peluquero o fecha, recalcular turno por peluquero/día
  let updateData = {
    sede: sede ?? citaBase.sede,
    peluquero: peluquero ?? citaBase.peluquero,
    puestoTrabajo: puestoTrabajo ?? citaBase.puestoTrabajo,
    servicios: servicios ?? citaBase.servicios,
    fechaInicio,
    fechaFin,
    observaciones: observaciones ?? citaBase.observaciones
  };

  // recalcular fechaBase y turno si cambia la fecha o peluquero
  const fechaBaseNueva = new Date(fechaInicio); fechaBaseNueva.setHours(0, 0, 0, 0);
  const peluqueroNuevo = peluquero ?? citaBase.peluquero;
  if (
    fechaBaseNueva.getTime() !== new Date(citaBase.fechaBase).getTime() ||
    peluqueroNuevo.toString() !== (citaBase.peluquero?.toString ? citaBase.peluquero.toString() : String(citaBase.peluquero))
  ) {
    const inicioDia = new Date(fechaInicio); inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaInicio); finDia.setHours(23, 59, 59, 999);
    const ultimoTurno = await Cita.findOne({
      peluquero: peluqueroNuevo,
      fechaBase: { $gte: inicioDia, $lte: finDia },
      _id: { $ne: id }
    }).sort({ turno: -1 }).lean();
    updateData.fechaBase = fechaBaseNueva;
    updateData.turno = (ultimoTurno?.turno || 0) + 1;
  }

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cita = await Cita.findById(id)
      .session(session)
      .populate('servicios');

    if (!cita) {
      throw { status: 404, message: 'Cita no encontrada' };
    }

    if (cita.estado !== 'en_proceso') {
      throw { status: 400, message: 'La cita no está en proceso y no puede finalizarse' };
    }

    if (!cita.inicioServicio) {
      throw { status: 400, message: 'La cita no tiene hora de inicio registrada' };
    }

    // 🔹 Calcular fecha fin
    let fechaFin;

    if (hora) {
      const [horas, minutos] = hora.split(':').map(Number);

      if (isNaN(horas) || isNaN(minutos)) {
        throw { status: 400, message: 'Formato de hora inválido' };
      }

      fechaFin = new Date(cita.inicioServicio);
      fechaFin.setHours(horas, minutos, 0, 0);
    } else {
      fechaFin = new Date();
    }

    if (fechaFin < cita.inicioServicio) {
      throw { status: 400, message: 'La hora de finalización no puede ser menor a la hora de inicio' };
    }

    cita.finServicio = fechaFin;
    cita.duracionRealMin = calcularDuracionReal(cita.inicioServicio, fechaFin);
    cita.estado = 'finalizada';

    // 🔹 Calcular total
    const total = (cita.servicios || []).reduce(
      (acc, s) => acc + (s.precio || 0),
      0
    );

    // 🔥 Crear pago SOLO si no existe
    if (!cita.pago) {
      const pago = new Pago({
        cita: cita._id,
        monto: total,
        metodo: null,
        estado: 'pendiente',
        fecha: null
      });

      await pago.save({ session });

      cita.pago = pago._id;
    }

    await cita.save({ session });

    await session.commitTransaction();
    session.endSession();

    return await Cita.findById(id).populate(CITA_POPULATE);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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
  const fechaInicio = new Date(fecha); fechaInicio.setHours(0, 0, 0, 0);
  const fechaFin = new Date(fecha); fechaFin.setHours(23, 59, 59, 999);

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

  // calcular turno por peluquero y día
  const inicioDia = new Date(fechaInicio); inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fechaInicio); finDia.setHours(23, 59, 59, 999);
  const ultimoTurno = await Cita.findOne({
    peluquero: citaOriginal.peluquero,
    fechaBase: { $gte: inicioDia, $lte: finDia }
  }).sort({ turno: -1 }).lean();
  const turno = (ultimoTurno?.turno || 0) + 1;

  const fechaBase = new Date(fechaInicio); fechaBase.setHours(0, 0, 0, 0);

  const nuevaCita = await Cita.create({
    cliente: citaOriginal.cliente,
    peluquero: citaOriginal.peluquero,
    sede: citaOriginal.sede,
    puestoTrabajo: citaOriginal.puestoTrabajo,
    servicios: citaOriginal.servicios,
    fechaInicio,
    fechaFin,
    fechaBase,
    turno,
    estado: 'pendiente'
  });

  return Cita.findById(nuevaCita._id).populate(CITA_POPULATE);
};

const obtenerCitasPorRango = async ({ fechaInicio, fechaFin }) => {
  if (!fechaInicio || !fechaFin) throw { status: 400, message: 'Se requieren fechaInicio y fechaFin' };
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin); fin.setHours(23, 59, 59, 999);

  return await Cita.find({
    estado: { $in: ESTADOS_ACTIVOS },
    fechaInicio: { $gte: inicio },
    fechaFin: { $lte: fin }
  }).populate(CITA_POPULATE).lean();
};

// ===================== pagarCita =====================
const pagarCita = async (id, monto, metodo) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cita = await Cita.findById(id).session(session);
    if (!cita) throw { status: 404, message: 'Cita no encontrada' };
    if (cita.estado === 'cancelada') throw { status: 400, message: 'No se puede pagar una cita cancelada' };
    if (cita.estado === 'pagada') throw { status: 400, message: 'La cita ya está pagada' };
    if (cita.estado !== 'finalizada') throw { status: 400, message: 'Solo se pueden pagar citas finalizadas' };
    if (!cita.pago) throw { status: 400, message: 'La cita no tiene un pago asociado' };

    const pago = await Pago.findById(cita.pago).session(session);
    if (!pago) throw { status: 400, message: 'No existe un pago asociado a esta cita' };
    if (pago.estado === EstadosPago.PAGADO) throw { status: 400, message: 'Este pago ya fue pagado' };

    if (!monto || monto <= 0) throw { status: 400, message: 'El monto debe ser mayor a 0' };
    if (!metodo || !Object.values(MetodosPago).includes(metodo)) throw { status: 400, message: 'Método de pago inválido' };

    pago.monto = monto;
    pago.metodo = metodo;
    pago.estado = EstadosPago.PAGADO;
    pago.fecha = new Date();

    await pago.save({ session });

    cita.estado = 'pagada';
    await cita.save({ session });

    await session.commitTransaction();
    session.endSession();

    return await Cita.findById(id).populate(CITA_POPULATE);

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
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
