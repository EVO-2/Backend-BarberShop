// routes/puestos.routes.js
const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const PuestoController = require('../controllers/puesto.controller');

// =============================
// Middleware global: todas las rutas requieren JWT
// =============================
router.use(validarJWT);

// =============================
// GET /api/puestos/por-sede/:sedeId
// Disponible para cualquier usuario autenticado
// =============================
router.get('/por-sede/:sedeId', PuestoController.obtenerPuestos);

// =============================
// PUT /api/puestos/:id/liberar
// Solo los administradores pueden liberar un puesto
// =============================
router.put('/:id/liberar', tieneRol('admin'), PuestoController.liberarPuesto);

// =============================
// PUT /api/puestos/:id/asignar
// Solo los administradores pueden asignar un puesto
// =============================
router.put('/:id/asignar', tieneRol('admin'), PuestoController.asignarPuesto);

module.exports = router;
