// src/services/notification.service.js
const EmailService = require("./email.service.js");
const SMSService = require("./sms.service.js");

class NotificationService {
  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
  }

  /**
   * Enviar notificación general
   * @param {Object} options
   * @param {"email"|"sms"} options.type - Tipo de notificación
   * @param {String} options.to - Destinatario (email o número de teléfono)
   * @param {String} options.template - Nombre de la plantilla (solo email)
   * @param {Object} options.data - Datos dinámicos para la plantilla
   * @param {String} options.message - Mensaje plano (solo SMS)
   */
  async sendNotification({ type, to, template, data, message }) {
    if (type === "email") {
      return this.emailService.sendTemplate(to, template, data);
    }
    if (type === "sms") {
      return this.smsService.sendSMS(to, message);
    }
    throw new Error("Tipo de notificación no soportado");
  }
}

module.exports = new NotificationService();
