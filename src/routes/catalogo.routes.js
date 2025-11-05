const express = require('express');
const router = express.Router();
const CatalogoController = require('../controllers/catalogo.controller');

// Usa exactamente los mismos nombres que exporta el controller
router.get('/sedes',       CatalogoController.obtenerSedes);
router.get('/puestos',     CatalogoController.obtenerPuestosPorSede); // ?sede=...
router.get('/peluqueros',  CatalogoController.obtenerPeluqueros);
router.get('/servicios',   CatalogoController.obtenerServicios);

module.exports = router;
