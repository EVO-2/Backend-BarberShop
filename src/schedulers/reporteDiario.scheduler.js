const schedule = require('node-schedule');
const Cita = require('../models/Cita.model');
const enviarEmail = require('../helpers/enviarEmail');

const enviarReporteDiario = async () => {
    try {
        console.log('📊 Generando reporte diario...');
        
        // Obtener la fecha de hoy al inicio y final del día
        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);

        // Buscar todas las citas de hoy
        const citasHoy = await Cita.find({
            fecha: {
                $gte: inicioDia,
                $lte: finDia
            }
        }).populate('cliente').populate('peluquero').populate('servicios');

        // Calcular estadísticas
        const totalCitas = citasHoy.length;
        const citasCompletadas = citasHoy.filter(c => c.estado === 'Completado').length;
        const citasPendientes = citasHoy.filter(c => c.estado === 'Pendiente').length;
        
        let ingresosEstimados = 0;
        citasHoy.forEach(cita => {
            if (cita.estado === 'Completado' && cita.servicios) {
                cita.servicios.forEach(s => ingresosEstimados += (s.precio || 0));
            }
        });

        // Crear cuerpo del correo HTML
        const htmlReporte = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h1 style="color: #2c3e50;">📊 Reporte Diario de BarberShop</h1>
                <p>Resumen de actividades del día: <strong>${inicioDia.toLocaleDateString('es-CO')}</strong></p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <ul style="list-style-type: none; padding: 0; font-size: 16px;">
                        <li style="margin-bottom: 10px;">✂️ <strong>Total Citas Agendadas:</strong> ${totalCitas}</li>
                        <li style="margin-bottom: 10px;">✅ <strong>Citas Completadas:</strong> ${citasCompletadas}</li>
                        <li style="margin-bottom: 10px;">⏳ <strong>Citas Pendientes/Canceladas:</strong> ${citasPendientes}</li>
                        <li style="margin-bottom: 10px; color: #27ae60; font-size: 18px;">💰 <strong>Ingresos Estimados:</strong> $${ingresosEstimados.toLocaleString('es-CO')}</li>
                    </ul>
                </div>

                <p style="margin-top: 30px; font-size: 14px; color: #7f8c8d;">
                    Generado automáticamente por el sistema BarberShop
                </p>
            </div>
        `;

        // Enviar al dueño (Se asume que es el EMAIL_USER, o se puede configurar otra variable)
        const emailDueno = process.env.OWNER_EMAIL || process.env.EMAIL_USER;

        await enviarEmail({
            to: emailDueno,
            subject: `Reporte Diario BarberShop - ${inicioDia.toLocaleDateString('es-CO')}`,
            html: htmlReporte
        });

        console.log('✅ Reporte diario enviado con éxito al dueño.');
    } catch (error) {
        console.error('❌ Error generando el reporte diario:', error);
    }
};

// Programar para las 11:59 PM todos los días
const iniciarCronReporteDiario = () => {
    schedule.scheduleJob('59 23 * * *', enviarReporteDiario);
    console.log('⏰ [Cron] Reporte diario programado para las 23:59 de cada día.');
};

module.exports = {
    enviarReporteDiario,
    iniciarCronReporteDiario
};
