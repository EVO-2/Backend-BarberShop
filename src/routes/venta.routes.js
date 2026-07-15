const { Router } = require('express');
const { registrarVenta, obtenerVentas } = require('../controllers/venta.controller');
const { validarJWT } = require('../middlewares/validarJWT');

const router = Router();

// Todas las rutas requieren JWT
router.use(validarJWT);

// Registrar una nueva venta
router.post('/', registrarVenta);

// Obtener listado/historial de ventas
router.get('/', obtenerVentas);

module.exports = router;
