const cron = require('node-cron');
const Empresa = require('../models/Empresa.model');

// ==========================================
// ⏰ TAREA AUTOMÁTICA DE SUSCRIPCIONES (CRON JOB)
// Ejecución: Todos los días a la medianoche (00:00)
// ==========================================

const initSubscriptionCron = () => {
    // Expresión Cron: '0 0 * * *' (A las 00:00 cada día)
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [Cron] Verificando vencimientos de suscripciones...');

        try {
            const hoy = new Date();

            // 1. Vencer empresas en "trial" cuya fecha de prueba ya pasó
            const trialsVencidos = await Empresa.updateMany(
                {
                    suscripcionEstado: 'trial',
                    fechaFinPrueba: { $lt: hoy }
                },
                {
                    $set: { suscripcionEstado: 'vencida' }
                }
            );

            if (trialsVencidos.modifiedCount > 0) {
                console.log(`[Cron] ${trialsVencidos.modifiedCount} empresas en Trial han vencido.`);
            }

            // 2. Vencer empresas "activas" cuyo pago recurrente se atrasó
            // asumiendo que damos 3 días de gracia o bloqueamos de inmediato
            const suscripcionesVencidas = await Empresa.updateMany(
                {
                    suscripcionEstado: 'activa',
                    fechaProximoCobro: { $lt: hoy }
                },
                {
                    $set: { suscripcionEstado: 'vencida' }
                }
            );

            if (suscripcionesVencidas.modifiedCount > 0) {
                console.log(`[Cron] ${suscripcionesVencidas.modifiedCount} empresas Activas han vencido por falta de pago.`);
            }

        } catch (error) {
            console.error('❌ [Cron Error] Error al verificar suscripciones:', error);
        }
    });

    console.log('✅ Cron Job de Suscripciones inicializado.');
};

module.exports = {
    initSubscriptionCron
};
