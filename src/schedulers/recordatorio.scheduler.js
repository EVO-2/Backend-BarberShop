const schedule = require('node-schedule'); // npm install node-schedule
const NotificationService = require('../services/notification.service');
const Cliente = require('../models/Cliente.model');
const Cita = require('../models/Cita.model');

const programarRecordatorio = async (cita) => {
  if (!cita.fecha || !cita.cliente) return;

  // Calcular la fecha del recordatorio: 1 hora 20 minutos antes
  const fechaCita = new Date(cita.fecha);
  const fechaRecordatorio = new Date(fechaCita.getTime() - (80 * 60 * 1000)); // 80 min antes

  // Programar el recordatorio
  schedule.scheduleJob(fechaRecordatorio, async () => {
    try {
      // Poblar usuario y servicios
      const clienteData = await Cliente.findById(cita.cliente).populate('usuario', 'nombre correo telefono');
      const user = clienteData.usuario;

      const citaPop = await Cita.findById(cita._id).populate({ path: 'servicios', select: 'nombre' });
      const servicioNombre = citaPop.servicios?.length
        ? citaPop.servicios.map(s => s.nombre).join(', ')
        : 'Servicio no definido';

      const fechaFormateada = fechaCita.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const horaFormateada = fechaCita.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";

      // ======= Correo =======
      if (user.correo) {
        await NotificationService.sendNotification({
          type: "email",
          to: user.correo,
          template: "cita-recordatorio",
          data: {
            subject: "Recordatorio de tu cita en Barbería JEVO",
            variables: {
              NOMBRE: user.nombre,
              FECHA: fechaFormateada,
              HORA: horaFormateada,
              SERVICIO: servicioNombre,
              TURNO: cita.turno,
              URL: `${frontendUrl}/mis-citas/${cita._id}`,
              YEAR: new Date().getFullYear(),
              REPROGRAMAR_HORA: '1 hora antes',
            },
          },
        });
      }

      // ======= SMS =======
      const telefonoE164 = clienteData.telefono
        ? (clienteData.telefono.startsWith('+') ? clienteData.telefono : '+57' + clienteData.telefono)
        : null;

      if (telefonoE164 && /^\+\d{10,15}$/.test(telefonoE164)) {
        await NotificationService.sendNotification({
          type: "sms",
          to: telefonoE164,
          message: `Hola ${user.nombre}, recuerda tu cita para ${servicioNombre} el ${fechaFormateada} a las ${horaFormateada}. Puedes reprogramarla hasta 1 hora antes.`,
        });
      }
    } catch (err) {
      console.error('❌ Error enviando recordatorio:', err.message);
    }
  });
};

module.exports = { programarRecordatorio };
