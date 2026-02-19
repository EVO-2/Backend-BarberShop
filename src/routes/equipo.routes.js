// routes/equipo.routes.js
const express = require('express');
const router = express.Router();
const equipoCtrl = require('../controllers/equipo.controller');
const movimientoCtrl = require('../controllers/equipoMovimiento.controller');

// Middleware de autenticación (ejemplo, reemplaza por tu auth real)
const auth = (req, res, next) => {
    // ejemplo: req.uid = usuarioId obtenido del token
    next();
};

// ================================
// RUTAS CRUD EQUIPOS
// ================================

// Crear equipo
router.post('/', auth, equipoCtrl.crearEquipo);

// Listar equipos con filtros y paginación
router.get('/', auth, equipoCtrl.listarEquipos);

// Obtener detalle de un equipo
router.get('/:id', auth, equipoCtrl.obtenerEquipoPorId);

// Actualizar equipo
router.put('/:id', auth, equipoCtrl.actualizarEquipo);

// Baja lógica / desactivar equipo
router.patch('/:id/desactivar', auth, equipoCtrl.desactivarEquipo);

// Eliminar físico (opcional)
router.delete('/:id', auth, equipoCtrl.eliminarEquipo);

// ================================
// RUTAS MOVIMIENTOS EQUIPO
// ================================

// Crear movimiento manual
router.post('/:id/movimientos', auth, movimientoCtrl.crearMovimiento);

// Listar movimientos de un equipo
router.get('/:id/movimientos', auth, movimientoCtrl.listarMovimientosPorEquipo);

module.exports = router;
