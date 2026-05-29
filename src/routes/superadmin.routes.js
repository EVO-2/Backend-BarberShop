const { Router } = require('express');
const { check } = require('express-validator');
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const validarCampos = require('../middlewares/validarCampos');
const {
    obtenerEstadisticasGlobales,
    obtenerEmpresas,
    actualizarSuscripcionEmpresa,
    toggleEmpresaEstado
} = require('../controllers/superadmin.controller');

const router = Router();

// Todas las rutas de este archivo están protegidas por JWT y requieren rol 'superadmin'
router.use(validarJWT);
router.use(tieneRol('superadmin'));

// 📊 Estadísticas globales del SaaS
router.get('/stats', obtenerEstadisticasGlobales);

// 🏢 Obtener todas las empresas registradas
router.get('/empresas', obtenerEmpresas);

// 🔑 Actualizar suscripción de una empresa
router.put(
    '/empresas/:id/suscripcion',
    [
        check('plan', 'El plan debe ser uno de: trial, basico, pro, premium').optional().isIn(['trial', 'basico', 'pro', 'premium']),
        check('suscripcionEstado', 'El estado debe ser uno de: trial, activa, vencida, suspendida, cancelada').optional().isIn(['trial', 'activa', 'vencida', 'suspendida', 'cancelada']),
        validarCampos
    ],
    actualizarSuscripcionEmpresa
);

// 🚫 Toggle de estado (Habilitar/Deshabilitar empresa)
router.patch(
    '/empresas/:id/estado',
    [
        check('estado', 'El campo estado es obligatorio y debe ser boolean').isBoolean(),
        validarCampos
    ],
    toggleEmpresaEstado
);

module.exports = router;
