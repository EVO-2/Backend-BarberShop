const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const {
  crearPeluquero,
  obtenerPeluqueros,
  obtenerPeluqueroPorId,
  actualizarPeluquero,
  desactivarPeluquero,
  activarPeluquero
} = require('../controllers/peluquero.controller');

// Todas las rutas protegidas con JWT
router.use(validarJWT);

// CRUD Peluquero
router.post('/', crearPeluquero);
router.get('/', obtenerPeluqueros);
router.get('/:id', obtenerPeluqueroPorId);
router.put('/:id', actualizarPeluquero);
router.put('/desactivar/:id', desactivarPeluquero);
router.put('/activar/:id', activarPeluquero);

module.exports = router;
