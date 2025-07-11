const { Router } = require('express');
const { check } = require('express-validator');
const { login } = require('../controllers/auth.controller');
const validarCampos = require('../middlewares/validarCampos');

const router = Router();

// Ruta: POST /api/auth/login
router.post('/login', [
  check('correo', 'El correo es obligatorio').isEmail(),
  check('password', 'La contraseña es obligatoria').notEmpty(),
  validarCampos, 
  login         
]);

module.exports = router;
