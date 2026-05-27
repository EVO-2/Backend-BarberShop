const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');

// ⚙️ Verificación del Webhook (GET)
// Meta realiza esta petición para validar que tu servidor está disponible y seguro
router.get('/webhook', whatsappController.verificarWebhook);

// 📱 Recepción de Mensajes y Eventos en Tiempo Real (POST)
// Meta Cloud API envía aquí las notificaciones de mensajes entrantes
router.post('/webhook', whatsappController.recibirMensaje);

module.exports = router;
