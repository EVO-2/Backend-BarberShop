const { Router } = require('express');
const { check } = require('express-validator');
const validarCampos = require('../middlewares/validarCampos');
const { registrarEmpresa } = require('../controllers/onboarding.controller');

const router = Router();

// ==========================================
// 🏢 RUTAS DE ONBOARDING (PÚBLICAS)
// ==========================================

// POST: /api/onboarding/registrar
router.post('/registrar', [
    check('empresa.nombre', 'El nombre de la empresa es obligatorio').not().isEmpty(),
    check('usuario.nombre', 'El nombre del usuario es obligatorio').not().isEmpty(),
    check('usuario.correo', 'El correo no es válido').isEmail(),
    check('usuario.password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    validarCampos
], registrarEmpresa);

module.exports = router;
