const mjml2html = require('mjml');

const generarTemplateRecordatorio = (data) => {
  const {
    nombre,
    fecha,
    hora,
    servicio,
    turno,
    url
  } = data;

  const mjml = `
  <mjml>
    <mj-head>
      <mj-preview>Recordatorio de tu cita ⏰</mj-preview>

      <mj-attributes>
        <mj-all font-family="Arial, sans-serif" />
        <mj-text color="#333333" font-size="16px" />
        <mj-button 
          background-color="#032e4d" 
          color="#ffffff" 
          border-radius="8px" 
          font-size="16px"
          font-weight="600"
        />
      </mj-attributes>
    </mj-head>

    <mj-body background-color="#f4f6f8">

      <!-- HEADER -->
      <mj-section background-color="#032e4d" padding="20px">
        <mj-column>
          <mj-text align="center" color="#ffffff" font-size="22px" font-weight="700">
            💈 Cristian BarberShop
          </mj-text>
        </mj-column>
      </mj-section>

      <!-- CARD -->
      <mj-section padding="20px">
        <mj-column background-color="#ffffff" border-radius="12px" padding="25px">

          <mj-text font-size="20px" font-weight="600" color="#032e4d">
            Hola ${nombre},
          </mj-text>

          <mj-text color="#555555">
            Esto es un <strong>recordatorio</strong> de tu próxima cita. Aquí tienes los detalles:
          </mj-text>

          <!-- DETALLES -->
          <mj-section background-color="#f0f4f8" border-radius="10px" padding="15px">
            <mj-column>
              <mj-text align="center" font-size="16px" color="#000000">
                📅 <strong>${fecha}</strong><br/>
                ⏰ <strong>${hora}</strong><br/>
                💈 <strong>${servicio}</strong><br/>
                🆔 Turno: <strong>#${turno}</strong>
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- BOTÓN -->
          <mj-button href="${url}" padding-top="20px">
            Ver mi cita
          </mj-button>

        </mj-column>
      </mj-section>

      <!-- FOOTER -->
      <mj-section padding="20px">
        <mj-column>
          <mj-text align="center" font-size="13px" color="#999999">
            BarberShop © ${new Date().getFullYear()}<br/>
            Este es un mensaje automático, por favor no responder.
          </mj-text>
        </mj-column>
      </mj-section>

    </mj-body>
  </mjml>
  `;

  const { html } = mjml2html(mjml);

  return html;
};

module.exports = generarTemplateRecordatorio;