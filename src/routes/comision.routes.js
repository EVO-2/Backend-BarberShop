const router = require('express').Router();
const {
  getComisionesPendientes,
  pagarComisiones,
  getMiComision,
  getHistorialPagos,
  getMiHistorialPagos
} = require('../controllers/comision.controller');
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');

// Rutas para Admin
router.get('/pendientes', validarJWT, tieneRol('admin'), getComisionesPendientes);
router.post('/pagar', validarJWT, tieneRol('admin'), pagarComisiones);
router.get('/historial', validarJWT, tieneRol('admin'), getHistorialPagos);

// Rutas para Profesional (Barbero, Manicurista)
router.get('/mis-comisiones', validarJWT, tieneRol('barbero', 'manicurista'), getMiComision);
router.get('/mis-pagos', validarJWT, tieneRol('barbero', 'manicurista'), getMiHistorialPagos);

module.exports = router;
