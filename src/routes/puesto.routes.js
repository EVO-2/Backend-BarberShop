const express = require('express');
const router = express.Router();
const PuestoController = require('../controllers/puesto.controller');

// Obtener puestos filtrados (sede, peluquero, etc.)
router.get('/', PuestoController.obtenerPuestos);

// Liberar puesto de trabajo (desasociar peluquero)
router.put('/:id/liberar', PuestoController.liberarPuesto);

// Asignar peluquero a un puesto de trabajo
router.put('/:id/asignar', PuestoController.asignarPuesto);

module.exports = router;
