const { Router } = require('express');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/validarJWT');
const { suscribir, getPublicKey } = require('../controllers/notificacion.controller');

const router = Router();

// ==========================================
// Rutas de Notificaciones Web Push
// ==========================================

// Obtener llave pública VAPID (No requiere JWT para obtenerla, aunque podría)
router.get('/vapid-public-key', getPublicKey);

// Suscribirse a las notificaciones Web Push
router.post('/subscribe', [
  validarJWT,
  check('endpoint', 'El endpoint es obligatorio').not().isEmpty(),
  check('keys', 'Las llaves (keys) son obligatorias').not().isEmpty(),
  validarCampos
], suscribir);

module.exports = router;
