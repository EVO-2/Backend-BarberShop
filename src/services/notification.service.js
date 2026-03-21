const EmailService = require('./email.service');

// 🔥 IMPORTS
const generarTemplateRecordatorio = require('../templates/recordatorio.template');
const generarTemplateCita = require('../templates/citaConfirmada.template');
const enviarEmail = require('../helpers/enviarEmail');

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

  // 📧 CONFIRMACIÓN DE CITA
  async handleCitaCreada(data) {
    const {
      nombre,
      correo,
      telefono,
      fecha,
      hora,
      servicios,
      turno,
      url
    } = data;

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
        console.log(`📱 [NotificationService] Enviando WhatsApp a ${telefono}...`);

        const mensaje = generarMensajeRecordatorio({
          nombre,
          fecha,
          hora,
          servicio: servicios,
          url
        });

        await WhatsAppService.enviarMensaje({
          telefono,
          mensaje
        });

        console.log(`📱 [NotificationService] WhatsApp enviado a ${telefono}`);
      } catch (error) {
        console.error('❌ Error enviando WhatsApp:', error.message);
      }
    }
  }

  // ================= FUTURO =================
  // - Push notifications
}

module.exports = new NotificationService();