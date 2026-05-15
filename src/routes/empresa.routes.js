const express = require('express');
const router = express.Router();
const { validarJWT, verificarRol } = require('../middlewares/validarJWT');
const { toggleAgendamiento, obtenerEstadoAgendamiento } = require('../controllers/empresa.controller');

// Obtener estado para clientes y admins
router.get('/agendamiento-estado', validarJWT, obtenerEstadoAgendamiento);

// Cambiar estado solo para admins
router.put('/agendamiento-estado', [validarJWT, verificarRol('admin')], toggleAgendamiento);

module.exports = router;
