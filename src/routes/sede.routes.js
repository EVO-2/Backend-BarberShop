const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');

const sedeController = require('../controllers/sede.controller');

router.use(validarJWT);

router.get('/', sedeController.obtenerSedes);
router.post('/', sedeController.crearSede);
router.put('/:id', sedeController.actualizarSede);
router.patch('/:id/estado', sedeController.cambiarEstado);

module.exports = router;