const express = require('express');
const router = express.Router();

const {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  obtenerCitasDelCliente,
  obtenerCitasDelPeluquero
} = require('../controllers/cita.controller');

// Middlewares
const validarJWT = require('../middlewares/validarJWT');
const tieneRol = require('../middlewares/validarRol'); // ✅ IMPORTACIÓN CORRECTA

// ✅ Proteger todas las rutas con JWT
router.use(validarJWT);

// ================== Rutas protegidas por rol ==================

// Crear nueva cita (cliente o admin)
router.post('/', tieneRol('cliente', 'admin'), crearCita);

// Obtener TODAS las citas (solo admin)
router.get('/', tieneRol('admin'), obtenerCitas);

// Ver citas del cliente autenticado
router.get('/mis-citas', tieneRol('cliente'), obtenerCitasDelCliente);

// Ver citas del peluquero autenticado
router.get('/mis-citas-peluquero', tieneRol('peluquero'), obtenerCitasDelPeluquero);

// Ver cita por ID (todos los roles)
router.get('/:id', tieneRol('admin', 'cliente', 'peluquero'), obtenerCitaPorId);

// Actualizar cita (solo admin)
router.put('/:id', tieneRol('admin'), actualizarCita);

// Cancelar cita (admin, cliente, peluquero)
router.put('/:id/cancelar', tieneRol('admin', 'cliente', 'peluquero'), cancelarCita);

module.exports = router;
