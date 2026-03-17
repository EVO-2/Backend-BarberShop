const enviarEmail = require('./email.service');

const notificarNuevaCita = async (cita) => {
    try {

        console.log('📢 Enviando notificación...');

        if (cita?.cliente?.email) {
            await enviarEmail({
                to: cita.cliente.email,
                subject: '✅ Cita confirmada',
                html: `
          <h2>Hola ${cita.cliente.nombre || ''}</h2>
          <p>Tu cita fue creada correctamente.</p>
          <p><b>Fecha:</b> ${new Date(cita.fecha).toLocaleString()}</p>
        `
            });
        }

        console.log('✅ Notificación enviada');

    } catch (error) {
        console.error('❌ Error en notificación:', error.message);
    }
};

module.exports = {
    notificarNuevaCita
};