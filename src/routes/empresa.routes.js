const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdmin } = require('../middlewares/verificarRoles');
const { toggleAgendamiento, obtenerEstadoAgendamiento } = require('../controllers/empresa.controller');

// Obtener estado para clientes y admins
router.get('/agendamiento-estado', validarJWT, obtenerEstadoAgendamiento);

// Cambiar estado solo para admins
router.put('/agendamiento-estado', [validarJWT, esAdmin], toggleAgendamiento);

module.exports = router;
