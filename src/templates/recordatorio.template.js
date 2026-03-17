const fs = require('fs');
const path = require('path');
const mjml2html = require('mjml');

const generarTemplateRecordatorio = (data) => {
  const filePath = path.join(__dirname, 'recordatorio.mjml');

  let template = fs.readFileSync(filePath, 'utf8');

  template = template
    .replace(/%%NOMBRE%%/g, data.nombre)
    .replace(/%%FECHA%%/g, data.fecha)
    .replace(/%%HORA%%/g, data.hora)
    .replace(/%%SERVICIO%%/g, data.servicio)
    .replace(/%%TURNO%%/g, data.turno)
    .replace(/%%URL%%/g, data.url)
    .replace(/%%YEAR%%/g, new Date().getFullYear());

  const { html } = mjml2html(template);

  return html;
};

module.exports = generarTemplateRecordatorio;