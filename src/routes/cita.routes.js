// rutas/cita.routes.js
const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const citaController = require('../controllers/cita.controller');

/* ───────────── Roles ───────────── */
const ROLES = {
  ADMIN: 'admin',
  CLIENTE: 'cliente',
  BARBERO: 'barbero',
  MANICURISTA: 'manicurista'
};

/* ───────────── Rutas de citas ───────────── */

// 🔐 Obtener las citas según el rol autenticado (cliente, barbero o admin)
router.get(
  '/mis-citas',
  validarJWT,
  tieneRol(ROLES.CLIENTE, ROLES.BARBERO, ROLES.MANICURISTA, ROLES.ADMIN),
  citaController.obtenerMisCitas
);

// 🔹 Obtener citas por sede y fecha
router.get(
  '/por-sede-fecha',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.getCitasPorSedeYFecha
);

// 🔹 Obtener citas por fecha y hora
router.get(
  '/por-fecha-hora',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.obtenerCitasPorFechaYHora
);

// Admin: ver todas las citas
router.get(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  citaController.obtenerCitas
);

// 🔹 Admin y barbero/manicurista: obtener citas paginadas
router.get(
  '/paginadas',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.obtenerCitasPaginadas
);

// Admin y cliente: crear nueva cita
router.post(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE),
  citaController.crearCita
);

// Admin y cliente: actualizar cita existente
router.put(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE),
  citaController.actualizarCita
);

// Cliente y admin: reprogramar cita (solo fecha y observación)
router.put(
  '/:id/reprogramar',
  validarJWT,
  tieneRol(ROLES.CLIENTE, ROLES.ADMIN),
  citaController.reprogramarCita
);

/* ───────────── Nuevos endpoints de gestión ───────────── */

// Iniciar cita (barbero o admin)
router.put(
  '/:id/iniciar',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.iniciarCita
);

// Finalizar cita (barbero o admin)
router.put(
  '/:id/finalizar',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.finalizarCita
);

// Cancelar cita (barbero o admin)
router.put(
  '/:id/cancelar',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.cancelarCita
);

// Cliente: repetir una cita con nueva fecha/hora
router.post(
  '/repetir/:id',
  validarJWT,
  tieneRol(ROLES.CLIENTE),
  citaController.repetirCita
);

// Cliente: pagar una cita (ruta POST /:id/pago)
router.put(
  '/:id/pagar',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.pagarCita
);

// Cliente: reportar pago
router.put(
  '/:id/reportar-pago',
  validarJWT,
  tieneRol(ROLES.CLIENTE),
  citaController.reportarPago
);

// 🔹 Obtener citas en un rango de fechas (Admin, Cliente, profesional)
router.get(
  '/rango',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.obtenerCitasPorRango
);

// 🔹 Obtener todos los servicios activos
router.get(
  '/servicios',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO, ROLES.MANICURISTA),
  citaController.obtenerServicios
);

// 🔹 Admin: obtener cita por ID
router.get(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  citaController.obtenerCitaPorId
);

module.exports = router;
