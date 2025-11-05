// src/services/sms.service.js
const twilio = require("twilio");

class SMSService {
  constructor() {
    try {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.from = process.env.TWILIO_PHONE_NUMBER;
    } catch (err) {
      console.error("❌ Error inicializando Twilio:", err.message);
      throw new Error("No se pudo inicializar el cliente de Twilio");
    }
  }

  async sendSMS(to, message) {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.from,
        to,
      });

      return {
        success: true,
        to,
        sid: result.sid,
        status: result.status,
      };
    } catch (err) {
      console.error("❌ Error al enviar SMS:", err.message);
      return {
        success: false,
        to,
        error: err.message,
      };
    }
  }
}

module.exports = SMSService;
