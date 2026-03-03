const { Router } = require('express');
const { obtenerResumenDashboard } = require('../controllers/dashboard.controller');

const router = Router();

router.get('/resumen', obtenerResumenDashboard);

module.exports = router;