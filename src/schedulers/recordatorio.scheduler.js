const schedule = require('node-schedule');
const NotificationService = require('../services/notification.service');
const Cliente = require('../models/Cliente.model');
const Cita = require('../models/Cita.model');

// Cola opcional para producción (Railway/Vercel)
let remindersQueue;
try {
  const { remindersQueue: rq } = require('../config/queue');
  remindersQueue = rq;
} catch (error) {
  console.warn('⚠️ No se pudo inicializar Bull Queue, se usará node-schedule como fallback.');
}

const procesarRecordatorio = async (citaId, clienteId, turno) => {
  try {
    const cita = await Cita.findById(citaId).populate({ path: 'servicios', select: 'nombre' });
    if (!cita) return;

    const clienteData = await Cliente.findById(clienteId).populate('usuario', 'nombre correo telefono');
    if (!clienteData || !clienteData.usuario) return;

    const user = clienteData.usuario;
    const servicioNombre = cita.servicios?.length
      ? cita.servicios.map(s => s.nombre).join(', ')
      : 'Servicio no definido';

    const fechaCita = new Date(cita.fecha);
    const fechaFormateada = fechaCita.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaFormateada = fechaCita.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";

    const payload = {
      nombre: user.nombre,
      correo: user.correo,
      telefono: clienteData.telefono,
      fecha: fechaFormateada,
      hora: horaFormateada,
      servicios: servicioNombre,
      turno: turno,
      url: `${frontendUrl}/mis-citas/${cita._id}`
    };
    
    await NotificationService.notify('CITA_RECORDATORIO', payload);
  } catch (err) {
    console.error('❌ Error procesando recordatorio:', err.message);
  }
};

// Configurar Worker de Bull si Redis está disponible
if (remindersQueue) {
  remindersQueue.process(async (job) => {
    console.log(`[Bull] Procesando recordatorio para cita ${job.data.citaId}`);
    await procesarRecordatorio(job.data.citaId, job.data.clienteId, job.data.turno);
  });
}

const programarRecordatorio = async (cita) => {
  if (!cita.fecha || !cita.cliente) return;

  const fechaCita = new Date(cita.fecha);
  // 🔥 MODO PRUEBA RÁPIDA: El recordatorio sonará 1 minuto después de crear la cita
  const fechaRecordatorio = new Date(Date.now() + (1 * 60 * 1000)); 
  // const fechaRecordatorio = new Date(fechaCita.getTime() - (80 * 60 * 1000)); // 80 min antes

  // No programar si la hora ya pasó
  if (fechaRecordatorio < new Date()) {
      console.log('⏰ La hora del recordatorio ya pasó, omitiendo...');
      return;
  }

  // 1️⃣ OPClÓN A: Usar Colas con Redis (PRODUCCIÓN: Railway/Vercel)
  if (remindersQueue) {
    const delay = fechaRecordatorio.getTime() - Date.now();
    try {
      await remindersQueue.add({
        citaId: cita._id,
        clienteId: cita.cliente,
        turno: cita.turno
      }, {
        delay,
        jobId: `recordatorio-${cita._id}` // Evita duplicados
      });
      console.log(`🚀 [Queue] Recordatorio encolado para la cita ${cita._id}`);
    } catch (queueError) {
      console.error('⚠️ Error al encolar en Redis, usando fallback en memoria:', queueError.message);
      // Fallback de emergencia si Redis falla
      schedule.scheduleJob(fechaRecordatorio, async () => {
        await procesarRecordatorio(cita._id, cita.cliente, cita.turno);
      });
    }
  } 
  // 2️⃣ OPCIÓN B: Usar node-schedule (DESARROLLO LOCAL)
  else {
    schedule.scheduleJob(fechaRecordatorio, async () => {
      await procesarRecordatorio(cita._id, cita.cliente, cita.turno);
    });
    console.log(`⏰ [Memoria] Recordatorio programado en memoria para la cita ${cita._id}`);
  }
};

module.exports = { programarRecordatorio };
