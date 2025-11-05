// src/controllers/notification.controller.js
const NotificationService = require("../services/notification.service");

/**
 * Enviar notificación combinada (email + SMS)
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
      tasks.push(
        NotificationService.sendNotification({
          type: "email",
          to: email.to,
          template: email.template,
          data: email.data,
        })
      );
    }

    // 👉 Si viene bloque sms
    if (sms?.to) {
      tasks.push(
        NotificationService.sendNotification({
          type: "sms",
          to: sms.to,
          message: sms.message,
        })
      );
    }

    const results = await Promise.all(tasks);

    return res.json({
      success: true,
      message: "Notificación enviada",
      results,
    });
  } catch (err) {
    console.error("❌ Error en sendNotification:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

module.exports = { sendNotification };
