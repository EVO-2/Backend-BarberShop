const Pusher = require('pusher');

let pusher = null;

if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER) {
    pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID,
        key: process.env.PUSHER_KEY,
        secret: process.env.PUSHER_SECRET,
        cluster: process.env.PUSHER_CLUSTER,
        useTLS: true
    });
    console.log('⚡ [Pusher] Configurado para notificaciones en tiempo real.');
} else {
    console.log('⚠️ [Pusher] Variables de entorno no definidas. Pusher está desactivado.');
}

module.exports = pusher;
