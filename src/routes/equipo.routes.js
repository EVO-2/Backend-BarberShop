const express = require('express');
const router = express.Router();
const equipoCtrl = require('../controllers/equipo.controller');
const movimientoCtrl = require('../controllers/equipoMovimiento.controller');

// ======================================
// Middleware de autenticación (reemplazar por el real)
// ======================================
const auth = (req, res, next) => {
    // Aquí debes validar token y asignar:
    // req.uid = usuarioId
    next();
};

// ======================================
// RUTAS CRUD EQUIPOS
// ======================================

// Crear equipo
router.post('/', auth, equipoCtrl.crearEquipo);

// Listar equipos (con filtros, paginación y activo=true/false)
router.get('/', auth, equipoCtrl.listarEquipos);

// Obtener detalle por ID
router.get('/:id', auth, equipoCtrl.obtenerEquipoPorId);

// Actualizar equipo
router.put('/:id', auth, equipoCtrl.actualizarEquipo);

// ✅ Cambiar estado (activar / desactivar)
router.patch('/:id/estado', auth, equipoCtrl.cambiarEstado);

// ======================================
// RUTAS MOVIMIENTOS EQUIPO
// ======================================

// Crear movimiento manual
router.post('/:id/movimientos', auth, movimientoCtrl.crearMovimiento);

// Listar movimientos por equipo
router.get('/:id/movimientos', auth, movimientoCtrl.listarMovimientosPorEquipo);

module.exports = router;