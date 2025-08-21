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
  BARBERO: 'barbero'
};

/* ───────────── Rutas de citas ───────────── */

// 🔐 Obtener las citas según el rol autenticado (cliente, barbero o admin)
router.get(
  '/mis-citas',
  validarJWT,
  tieneRol(ROLES.CLIENTE, ROLES.BARBERO, ROLES.ADMIN),
  citaController.obtenerMisCitas
);

// 🔹 Obtener citas por sede y fecha
router.get(
  '/por-sede-fecha',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  citaController.getCitasPorSedeYFecha
);

// 🔹 Obtener citas por fecha y hora
router.get(
  '/por-fecha-hora',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  citaController.obtenerCitasPorFechaYHora
);

// Admin: ver todas las citas
router.get(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  citaController.obtenerCitas
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

// Cliente, barbero y admin: cancelar cita
router.put(
  '/cancelar/:id',
  validarJWT,
  tieneRol(ROLES.CLIENTE, ROLES.BARBERO, ROLES.ADMIN),
  citaController.cancelarCita
);

// Cliente: repetir una cita con nueva fecha/hora
router.post(
  '/repetir/:id',
  validarJWT,
  tieneRol(ROLES.CLIENTE),
  citaController.repetirCita
);

// Cliente: reprogramar una cita existente
router.patch(
  '/reprogramar/:id',
  validarJWT,
  tieneRol(ROLES.CLIENTE),
  citaController.reprogramarCita
);

// Cliente: pagar una cita
router.post(
  '/pagar/:id',
  validarJWT,
  tieneRol(ROLES.CLIENTE),
  citaController.pagarCita
);

// Barbero: finalizar cita
router.put(
  '/:id/finalizar',
  validarJWT,
  tieneRol(ROLES.BARBERO),
  citaController.finalizarCita
);

// 🔹 Obtener citas en un rango de fechas (Admin, Cliente, Barbero)
router.get(
  '/rango',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  citaController.obtenerCitasPorRango
);


// 🔹  obtener todos los servicios activos
router.get(
  '/servicios',
  validarJWT, 
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO), // roles permitidos
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
