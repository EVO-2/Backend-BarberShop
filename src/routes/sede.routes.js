const express = require('express');
const router = express.Router();

const sedeController = require('../controllers/sede.controller');

router.get('/', sedeController.obtenerSedes);
router.post('/', sedeController.crearSede);
router.put('/:id', sedeController.actualizarSede);
router.patch('/:id/estado', sedeController.cambiarEstado);

module.exports = router;