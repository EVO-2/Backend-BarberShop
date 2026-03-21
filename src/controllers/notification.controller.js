// src/controllers/notification.controller.js
const NotificationService = require("../services/notification.service");
const WhatsAppService = require("../services/whatsapp.service");
const EmailService = require("../services/email.service");
const generarTemplateRecordatorio = require("../templates/recordatorio.template");
const generarTemplateCita = require("../templates/citaConfirmada.template");

/**
 * Enviar notificación combinada (email + SMS/WhatsApp)
 * Body esperado en Postman:
 * {
 *   "email": {
 *      "to": "destinatario@mail.com",
 *      "template": "cita-confirmacion",
 *      "data": { ... }
 *   },
 *   "sms": {
 *      "to": "+573001112233",
 *      "message": "Texto SMS"
 *   }
 * }
 */
const sendNotification = async (req, res) => {
  try {
    const { email, sms } = req.body;

    if (!email && !sms) {
      return res.status(400).json({ error: "Debes especificar al menos email o sms" });
    }

    const tasks = [];

    // 👉 Si viene bloque email
    if (email?.to) {
      let html = "";
      if (email.template === "cita-recordatorio") {
        html = generarTemplateRecordatorio(email.data.variables || {});
      } else if (email.template === "cita-confirmacion") {
        html = generarTemplateCita(email.data.variables || {});
      } else {
        html = `<p>${JSON.stringify(email.data)}</p>`;
      }

      const emailService = new EmailService();
      tasks.push(
        emailService.sendEmail({
          to: email.to,
          subject: email.data?.subject || "Notificación de BarberShop",
          html
        })
      );
    }

    // 👉 Si viene bloque sms (Fallback a WhatsApp)
    if (sms?.to) {
      tasks.push(
        WhatsAppService.enviarMensaje({
          telefono: sms.to,
          mensaje: sms.message,
        })
      );
    }

    const results = await Promise.allSettled(tasks);

    return res.json({
      success: true,
      message: "Notificación procesada",
      results,
    });
  } catch (err) {
    console.error("❌ Error en sendNotification controller:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = { sendNotification };
