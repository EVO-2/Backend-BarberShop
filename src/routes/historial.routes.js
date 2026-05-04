const { Router } = require('express');
const { getHistorial } = require('../controllers/historial.controller');
const { validarJWT, verificarRol } = require('../middlewares/validarJWT');

const router = Router();

// Endpoint para consultar el historial de acciones y auditoría
router.get('/', [
    validarJWT,
    verificarRol('administrador', 'admin')
], getHistorial);

module.exports = router;
