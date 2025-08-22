// routes/pago.js
const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const pagoController = require('../controllers/pago.controller'); 

/* ───────────── Roles ───────────── */
const ROLES = {
  ADMIN: 'admin',
  CLIENTE: 'cliente',
  BARBERO: 'barbero'
};

/* ==================== RUTAS DE PAGOS ==================== */

// Crear un pago para una cita (cliente)
router.post(
  '/:citaId',
  validarJWT,
  tieneRol(ROLES.CLIENTE),
  pagoController.crearPago
);

// Obtener todos los pagos (admin)
router.get(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  pagoController.obtenerPagos
);

// Obtener pago por ID (admin)
router.get(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  pagoController.obtenerPagoPorId
);

// Actualizar pago (admin)
router.put(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  pagoController.actualizarPago
);

module.exports = router;
