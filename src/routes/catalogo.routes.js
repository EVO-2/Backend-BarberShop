const express = require('express');
const router = express.Router();
const CatalogoController = require('../controllers/catalogo.controller');
const { validarJWT } = require('../middlewares/validarJWT');

// Aplica validarJWT a cada ruta individualmente para no afectar otras rutas en /api
// router.use(validarJWT);

// Usa exactamente los mismos nombres que exporta el controller
router.get('/sedes',       validarJWT, CatalogoController.obtenerSedes);
router.get('/puestos',     validarJWT, CatalogoController.obtenerPuestosPorSede); // ?sede=...
router.get('/peluqueros',  validarJWT, CatalogoController.obtenerPeluqueros);
router.get('/servicios',   validarJWT, CatalogoController.obtenerServicios);

module.exports = router;
