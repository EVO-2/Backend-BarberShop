const { Router } = require('express');
const { body } = require('express-validator');
const { login } = require('../controllers/auth.controller');
const validarCampos = require('../middlewares/validarCampos');

const router = Router();

router.post('/login', [
  body('correo', 'Correo obligatorio').isEmail(),
  body('password', 'La contraseña es obligatoria').notEmpty(),
  validarCampos
], login);

module.exports = router;
