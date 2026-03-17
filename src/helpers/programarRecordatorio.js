const NotificationService = require('../services/notification.service');
const Cita = require('../models/Cita.model');

const programarRecordatorio = async (cita) => {
    try {
        const fechaCita = new Date(cita.fecha);

        // ⏰ 1 hora antes
        const fechaRecordatorio = new Date(fechaCita.getTime() - (60 * 60 * 1000));

        const delay = fechaRecordatorio.getTime() - Date.now();

        if (delay <= 0) return;

        setTimeout(async () => {
            try {
                const citaPop = await Cita.findById(cita._id)
                    .populate('servicios', 'nombre')
                    .populate({
                        path: 'cliente',
                        populate: {
                            path: 'usuario',
                            select: 'nombre correo'
                        }
                    });

                if (!citaPop) return;

                const servicios = citaPop.servicios?.map(s => s.nombre).join(', ') || '';

                const user = citaPop.cliente?.usuario;

                if (!user) return;

                const fechaObj = new Date(citaPop.fecha);

                const payload = {
                    nombre: user.nombre,
                    correo: user.correo,
                    fecha: fechaObj.toLocaleDateString('es-CO'),
                    hora: fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true }),
                    servicios,
                    turno: citaPop.turno,
                    url: `${process.env.FRONTEND_URL}/mis-citas/${citaPop._id}`
                };

                await NotificationService.notify('CITA_RECORDATORIO', payload);

            } catch (error) {
                console.error('Error enviando recordatorio:', error.message);
            }
        }, delay);

    } catch (error) {
        console.error('Error programando recordatorio:', error.message);
    }
};

module.exports = programarRecordatorio;