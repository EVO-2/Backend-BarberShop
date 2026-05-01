const EmailService = require('./email.service');

// 🔥 IMPORTS
const generarTemplateRecordatorio = require('../templates/recordatorio.template');
const generarTemplateCita = require('../templates/citaConfirmada.template');
const enviarEmail = require('../helpers/enviarEmail');
const pusher = require('../config/pusher');

// 🔥 NUEVO (WHATSAPP)
const WhatsAppService = require('./whatsapp.service');
const generarMensajeRecordatorio = require('../templates/whatsappRecordatorio.template');

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
  }

  // 🔥 Método principal
  async notify(event, payload) {
    try {
      switch (event) {
        case 'CITA_CREADA':
          await this.handleCitaCreada(payload);
          break;

        case 'CITA_RECORDATORIO':
          await this.handleRecordatorio(payload);
          break;

        default:
          console.warn(`⚠️ Evento no manejado: ${event}`);
      }
    } catch (error) {
      console.error('❌ Error en NotificationService:', error.message);
    }
  }

  // ================= EVENTOS =================

  // 📧 CONFIRMACIÓN DE CITA Y PUSHER REAL-TIME
  async handleCitaCreada(data) {
    const {
      nombre,
      correo,
      telefono,
      fecha,
      hora,
      servicios,
      turno,
      url,
      peluqueroId // Es buena práctica pasar el ID del peluquero si quieres notificar a uno específico
    } = data;

    // 1️⃣ NOTIFICAR AL BARBERO EN TIEMPO REAL (PUSHER)
    if (pusher) {
      try {
        // Generar un link de WhatsApp automático para que el barbero hable con el cliente
        let linkWhatsAppCliente = null;
        if (telefono) {
            const mensajeHola = `¡Hola ${nombre}! Confirmamos tu cita para el ${fecha} a las ${hora}. ¿Tienes alguna duda?`;
            linkWhatsAppCliente = WhatsAppService.generarEnlaceWhatsApp(telefono, mensajeHola);
        }

        pusher.trigger('barberia-channel', 'nueva-cita', {
          mensaje: `¡Nueva cita agendada por ${nombre}!`,
          fecha,
          hora,
          servicios,
          telefono,
          linkWhatsAppCliente
        });
        console.log(`⚡ [Pusher] Evento 'nueva-cita' enviado en tiempo real.`);
      } catch (pusherError) {
        console.error('❌ Error enviando evento Pusher:', pusherError.message);
      }
    }

    // 2️⃣ NOTIFICAR AL CLIENTE POR EMAIL
    if (correo) {
      try {
        console.log('📧 [NotificationService] Generando template MJML (Confirmación)...');

        const html = generarTemplateCita({
          nombre,
          fecha,
          hora,
          servicio: servicios,
          turno,
          url
        });

        console.log('📧 [NotificationService] Enviando email de confirmación...');

        await enviarEmail({
          to: correo,
          subject: 'Confirmación de tu cita 💈',
          html
        });

        console.log(`📧 [NotificationService] Email enviado a ${correo}`);
      } catch (error) {
        console.error('❌ Error enviando email de confirmación:', error.message);
      }
    }
  }

  // ⏰ RECORDATORIO DE CITA
  async handleRecordatorio(data) {
    const {
      nombre,
      correo,
      telefono, // 🔥 IMPORTANTE: ahora lo usamos
      fecha,
      hora,
      servicios,
      turno,
      url
    } = data;

    // ================= EMAIL =================
    if (correo) {
      try {
        console.log('⏰ [NotificationService] Generando template MJML (Recordatorio)...');

        const html = generarTemplateRecordatorio({
          nombre,
          fecha,
          hora,
          servicio: servicios,
          turno,
          url
        });

        console.log('📧 [NotificationService] Enviando email de recordatorio...');

        await enviarEmail({
          to: correo,
          subject: 'Recordatorio de tu cita ⏰',
          html
        });

        console.log(`📧 [NotificationService] Recordatorio enviado a ${correo}`);
      } catch (error) {
        console.error('❌ Error enviando recordatorio (email):', error.message);
      }
    }

    // ================= WHATSAPP =================
    if (telefono) {
      try {
        console.log(`📱 [NotificationService] Generando enlace de WhatsApp a ${telefono}...`);

        const mensaje = generarMensajeRecordatorio({
          nombre,
          fecha,
          hora,
          servicio: servicios,
          url
        });

        // Simplemente generamos la URL para no gastar en APIs, el frontend o el email pueden usarla
        const link = WhatsAppService.generarEnlaceWhatsApp(telefono, mensaje);
        console.log(`✅ [WhatsApp] Enlace directo de WhatsApp generado: ${link}`);
        // NOTA: Si queremos mandar este link por correo al peluquero, se puede hacer acá.
      } catch (error) {
        console.error('❌ Error generando WhatsApp:', error.message);
      }
    }
  }
}

module.exports = new NotificationService();