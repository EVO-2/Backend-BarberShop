/**
 * 🧪 SCRIPT DE PRUEBA DE INTEGRACIÓN INTERNA DE PUSHER (REAL-TIME)
 * Valida que el Backend se configure correctamente y emita eventos de tiempo real
 * sin generar errores de ejecución.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const NotificationService = require('../src/services/notification.service');
const pusher = require('../src/config/pusher');

console.log('🧪 Iniciando prueba interna de notificaciones en tiempo real...');

// 1. Validar carga de variables de entorno y configuración de Pusher
if (!pusher) {
  console.error('❌ Pusher no pudo inicializarse. Verifica que las variables PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET y PUSHER_CLUSTER estén configuradas en tu archivo .env.');
  process.exit(1);
}

console.log('✅ Conexión con Pusher inicializada correctamente.');

// 2. Simular un evento CITA_ACTUALIZADA
const mockPayload = {
  citaId: '60d5ec4b8f1b2c3d4e5f6a7b', // Mock ObjectId
  clienteId: '60d5ec4b8f1b2c3d4e5f6a7c',
  peluqueroId: '60d5ec4b8f1b2c3d4e5f6a7d',
  nombreCliente: 'Edward Test',
  fecha: new Date().toLocaleDateString('es-CO'),
  hora: '14:30 PM',
  nuevoEstado: 'en_proceso',
  mensaje: '🧪 Cita de prueba de Edward Test ha cambiado a en_proceso.'
};

console.log('📡 Emitiendo evento de prueba "CITA_ACTUALIZADA" a Pusher...');

NotificationService.notify('CITA_ACTUALIZADA', mockPayload)
  .then(() => {
    console.log('⚡ Evento emitido de manera asíncrona exitosamente.');
    console.log('🎉 Prueba interna finalizada con éxito.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fallo al emitir evento en NotificationService:', err.message);
    process.exit(1);
  });
