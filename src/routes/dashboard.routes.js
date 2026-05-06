const { Router } = require('express');
const { obtenerResumenDashboard } = require('../controllers/dashboard.controller');

const router = Router();

const { validarJWT } = require('../middlewares/validarJWT');

router.get('/resumen', validarJWT, obtenerResumenDashboard);

module.exports = router;