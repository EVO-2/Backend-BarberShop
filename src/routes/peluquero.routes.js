const express = require('express');
const router = express.Router();
const { crearPeluquero, actualizarPeluquero } = require('../controllers/peluquero.controller');


router.post('/', crearPeluquero);
router.put('/:id', actualizarPeluquero);

module.exports = router;
