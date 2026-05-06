const express = require('express');
const router = express.Router();
const equipoCtrl = require('../controllers/equipo.controller');
const movimientoCtrl = require('../controllers/equipoMovimiento.controller');

const { validarJWT } = require('../middlewares/validarJWT');

// ======================================
// RUTAS CRUD EQUIPOS
// ======================================

// Crear equipo
router.post('/', validarJWT, equipoCtrl.crearEquipo);

// Listar equipos (con filtros, paginación y activo=true/false)
router.get('/', validarJWT, equipoCtrl.listarEquipos);

// Obtener detalle por ID
router.get('/:id', validarJWT, equipoCtrl.obtenerEquipoPorId);

// Actualizar equipo
router.put('/:id', validarJWT, equipoCtrl.actualizarEquipo);

// ✅ Cambiar estado (activar / desactivar)
router.patch('/:id/estado', validarJWT, equipoCtrl.cambiarEstado);

// ======================================
// RUTAS MOVIMIENTOS EQUIPO
// ======================================

// Crear movimiento manual
router.post('/:id/movimientos', validarJWT, movimientoCtrl.crearMovimiento);

// Listar movimientos por equipo
router.get('/:id/movimientos', validarJWT, movimientoCtrl.listarMovimientosPorEquipo);

module.exports = router;