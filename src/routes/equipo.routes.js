// routes/equipo.routes.js
const express = require('express');
const router = express.Router();
const equipoCtrl = require('../controllers/equipo.controller');
const movimientoCtrl = require('../controllers/equipoMovimiento.controller');

// middlewares opcionales (reemplaza por tus middlewares)
const auth = (req, res, next) => { /* ejemplo: req.uid = ...; next(); */ next(); };

// Equipos CRUD
router.post('/', auth, equipoCtrl.crearEquipo);            // crear
router.get('/', auth, equipoCtrl.listarEquipos);          // listar (filtros)
router.get('/:id', auth, equipoCtrl.obtenerEquipoPorId);  // detalle
router.put('/:id', auth, equipoCtrl.actualizarEquipo);    // actualizar
router.delete('/:id', auth, equipoCtrl.eliminarEquipo);   // baja lógica

// Movimientos
router.post('/:id/movimientos', auth, movimientoCtrl.crearMovimiento); // crear movimiento (equipo in body)
router.get('/:id/movimientos', auth, movimientoCtrl.listarMovimientosPorEquipo); // historial por equipo

module.exports = router;
