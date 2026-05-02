// 🔥 IMPORTS
const generarTemplateRecordatorio = require('../templates/recordatorio.template');
const generarTemplateCita = require('../templates/citaConfirmada.template');
const enviarEmail = require('../helpers/enviarEmail');
const pusher = require('../config/pusher');

// 🔥 NUEVO (WHATSAPP)
const WhatsAppService = require('./whatsapp.service');
const generarMensajeRecordatorio = require('../templates/whatsappRecordatorio.template');

class NotificationService {
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
          linkWhatsAppCliente,
          peluqueroId
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
      url,
      peluqueroId
    } = data;

    // ================= WHATSAPP Y PUSHER (TIEMPO REAL) =================
    // Lo ejecutamos primero para que no sea bloqueado por demoras o errores del correo
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

        // Simplemente generamos la URL para no gastar en APIs
        const link = WhatsAppService.generarEnlaceWhatsApp(telefono, mensaje);
        console.log(`✅ [WhatsApp] Enlace directo de WhatsApp generado: ${link}`);
        
        // NOTIFICAR AL BARBERO EN TIEMPO REAL (PUSHER) CON EL ENLACE
        if (pusher) {
          pusher.trigger('barberia-channel', 'recordatorio-cita', {
            mensaje: `⏰ Recordatorio de cita inminente para ${nombre}.`,
            fecha,
            hora,
            telefono,
            linkWhatsAppCliente: link,
            peluqueroId
          });
          console.log(`⚡ [Pusher] Evento 'recordatorio-cita' enviado al barbero con el enlace de WhatsApp.`);
        }
      } catch (error) {
        console.error('❌ Error generando WhatsApp:', error.message);
      }
    }

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

        // NO usamos await aquí para no bloquear la ejecución si hay timeout
        enviarEmail({
          to: correo,
          subject: 'Recordatorio de tu cita ⏰',
          html
        }).then(() => {
          console.log(`📧 [NotificationService] Recordatorio enviado a ${correo}`);
        }).catch((error) => {
          console.error('❌ Error asíncrono enviando recordatorio (email):', error.message);
        });

      } catch (error) {
        console.error('❌ Error sincrono al preparar email:', error.message);
      }
    }
  }
}

module.exports = new NotificationService();