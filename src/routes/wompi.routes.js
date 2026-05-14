const { Router } = require('express');
const { getWompiKeys, generarFirma, webhookWompi } = require('../controllers/wompi.controller');
const { validarJWT } = require('../middlewares/validarJWT');

const router = Router();

// Rutas protegidas (Frontend solicita la firma antes de pagar)
router.get('/keys', validarJWT, getWompiKeys);
router.post('/firma', validarJWT, generarFirma);

// Ruta pública (Webhook donde Wompi avisa que el pago fue exitoso)
router.post('/webhook', webhookWompi);

module.exports = router;
