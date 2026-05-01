const Queue = require('bull');

// Determinar conexión a Redis
// Si la URL tiene el valor de prueba por defecto o está vacía, no inicializamos Bull
// para evitar spam de errores ECONNREFUSED en la consola.
let notificationQueue = null;
let remindersQueue = null;

const tieneRedisConfigurado = process.env.REDIS_URL && !process.env.REDIS_URL.includes('url-de-tu-redis');

if (tieneRedisConfigurado) {
    const redisConfig = process.env.REDIS_URL;

    // Crear colas
    notificationQueue = new Queue('notificaciones', redisConfig);
    remindersQueue = new Queue('recordatorios', redisConfig);

    // 🛡️ PROTECCIÓN ANTI-CRASH PARA RAILWAY
    notificationQueue.on('error', (error) => {
        console.error('⚠️ [Bull/Redis] Error en la cola de notificaciones:', error.message);
    });

    remindersQueue.on('error', (error) => {
        console.error('⚠️ [Bull/Redis] Error en la cola de recordatorios:', error.message);
    });

    console.log('🚀 [Colas] Sistema de colas (Bull) conectado a Redis exitosamente.');
} else {
    console.log('⚠️ [Colas] Redis no está configurado (usando fallback en memoria).');
}

module.exports = {
    notificationQueue,
    remindersQueue
};
