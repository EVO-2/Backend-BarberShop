const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const PuestoController = require('../controllers/puesto.controller');

// Todas las rutas protegidas con JWT
router.use(validarJWT);

// Obtener puestos filtrados por sede y peluquero
router.get('/por-sede/:sedeId', PuestoController.obtenerPuestos);

// Liberar puesto de trabajo (desasociar peluquero)
router.put('/:id/liberar', PuestoController.liberarPuesto);

// Asignar peluquero a un puesto de trabajo
router.put('/:id/asignar', PuestoController.asignarPuesto);

module.exports = router;
