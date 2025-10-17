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
// RUTAS ADMIN
// Solo los administradores pueden crear, actualizar, eliminar, asignar y liberar puestos
// =============================
router.post('/', tieneRol('admin'), PuestoController.crearPuesto);
router.put('/:id', tieneRol('admin'), PuestoController.actualizarPuesto);
router.delete('/:id', tieneRol('admin'), PuestoController.eliminarPuesto);
router.put('/:id/asignar', tieneRol('admin'), PuestoController.asignarPuesto);
router.put('/:id/liberar', tieneRol('admin'), PuestoController.liberarPuesto);

module.exports = router;
