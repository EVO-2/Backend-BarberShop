const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');

const citaController = require('../controllers/cita.controller');

/* ───────────── Rutas de citas ───────────── */

// 🔐 Obtener las citas según el rol autenticado (cliente, barbero o admin)
router.get(
  '/mis-citas',
  validarJWT,
  tieneRol('cliente', 'barbero', 'admin'),
  citaController.obtenerMisCitas
);

/* ───────────── Rutas protegidas por rol ───────────── */

// Nuevo endpoint: obtener citas por sede y fecha
router.get(
  '/por-sede-fecha',
  validarJWT,
  tieneRol('admin', 'cliente', 'barbero'),
  citaController.getCitasPorSedeYFecha
);

// Admin: ver todas las citas
router.get('/', validarJWT, tieneRol('admin'), citaController.obtenerCitas);

// Admin: obtener cita por ID
router.get('/:id', validarJWT, tieneRol('admin'), citaController.obtenerCitaPorId);

// Admin y cliente: crear nueva cita
router.post('/', validarJWT, tieneRol('admin', 'cliente'), citaController.crearCita);

// Admin: actualizar cita
router.put('/:id', validarJWT, tieneRol('admin'), citaController.actualizarCita);

// Cliente, barbero y admin: cancelar cita
router.put(
  '/cancelar/:id',
  validarJWT,
  tieneRol('cliente', 'barbero', 'admin'),
  citaController.cancelarCita
);

// Barbero: finalizar cita
router.put('/:id/finalizar', validarJWT, tieneRol('barbero'), citaController.finalizarCita);

module.exports = router;
