const express = require('express');
const router = express.Router();
const { validarJWT, verificarRol } = require('../middlewares/validarJWT');
const { toggleAgendamiento, obtenerEstadoAgendamiento, obtenerInfoEmpresa, actualizarInfoEmpresa } = require('../controllers/empresa.controller');

// Obtener estado para clientes y admins
router.get('/agendamiento-estado', validarJWT, obtenerEstadoAgendamiento);

// Cambiar estado solo para admins
router.put('/agendamiento-estado', [validarJWT, verificarRol('admin')], toggleAgendamiento);

// Obtener perfil corporativo e información general
router.get('/info', validarJWT, obtenerInfoEmpresa);

// Actualizar información corporativa y horarios de atención (Sólo admin)
router.put('/info', [validarJWT, verificarRol('admin')], actualizarInfoEmpresa);

module.exports = router;
