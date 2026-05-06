const { Router } = require('express');
const { check } = require('express-validator');
const suscripcionesCtrl = require('../controllers/suscripciones.controller');
const validarCampos = require('../middlewares/validarCampos');

const router = Router();

// ==========================================
// 🚀 Registro SaaS (Público)
// ==========================================
router.post('/registro', [
  check('nombreDueño', 'El nombre del dueño es obligatorio').not().isEmpty(),
  check('correoDueño', 'El correo debe ser válido').isEmail(),
  check('passwordDueño', 'La contraseña debe tener mínimo 6 caracteres').isLength({ min: 6 }),
  check('nombreEmpresa', 'El nombre de la empresa es obligatorio').not().isEmpty(),
  validarCampos
], suscripcionesCtrl.registrarNuevaEmpresa);

module.exports = router;
