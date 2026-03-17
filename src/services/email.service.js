const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendEmail({ to, subject, html }) {
    if (!to) {
      throw new Error('El destinatario del correo es obligatorio');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"BarberShop" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      });

      console.log(`📧 Email enviado a ${to}: ${info.messageId}`);
      return info;

    } catch (error) {
      console.error('❌ Error enviando email:', error.message);
      throw error;
    }
  }
}

module.exports = EmailService;