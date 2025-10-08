// src/services/email.service.js
const sgMail = require("@sendgrid/mail");
const path = require("path");
const fs = require("fs");
const mjml2html = require("mjml");
const { htmlToText } = require("html-to-text");

class EmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  async sendTemplate(to, templateName, data) {
    try {
      // Ruta a la plantilla MJML
      const templatePath = path.join("src", "templates", `${templateName}.mjml`);

      // Leer la plantilla
      let mjmlTemplate = fs.readFileSync(templatePath, "utf8");

      // Reemplazar variables dinámicas (%%VARIABLE%%)
      for (const key in data.variables) {
        const regex = new RegExp(`%%${key.toUpperCase()}%%`, "g");
        mjmlTemplate = mjmlTemplate.replace(regex, data.variables[key]);
      }

      // Compilar MJML a HTML
      const { html } = mjml2html(mjmlTemplate, { filePath: templatePath });

      // Generar versión en texto plano
      const text = htmlToText(html);

      // Configuración del correo
      const msg = {
        to,
        from: process.env.SENDGRID_FROM, // Remitente verificado en SendGrid
        subject: data.subject || "Notificación Barbería JEVO",
        html,
        text,
      };

      // Enviar correo
      await sgMail.send(msg);

      return {
        success: true,
        message: "Correo enviado con éxito",
        to,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  }
}

module.exports = EmailService;
