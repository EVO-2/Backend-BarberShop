const express = require('express');
const router = express.Router();

// Importación desestructurada de funciones desde el controlador
const {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita // ✅ Importaste correctamente
} = require('../controllers/cita.controller');

// Cancelar (cambiar estado) de una cita — DEBE ir antes del `/:id`
router.put('/:id/cancelar', cancelarCita);

// Crear una nueva cita
router.post('/', crearCita);

// Obtener todas las citas
router.get('/', obtenerCitas);

// Obtener una cita por ID
router.get('/:id', obtenerCitaPorId);

// Actualizar una cita
router.put('/:id', actualizarCita);

module.exports = router;
