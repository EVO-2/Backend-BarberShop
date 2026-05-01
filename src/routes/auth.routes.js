const { Router } = require('express');
const { check } = require('express-validator');
const {
  login,
  registro,
  verificarCorreoExistente
} = require('../controllers/auth.controller');

const validarCampos = require('../middlewares/validarCampos');


const router = Router();

// 🔐 Login
router.post(
  '/login',
  [
    check('correo', 'El correo es obligatorio').isEmail(),
    check('password', 'La contraseña es obligatoria').notEmpty(),
    validarCampos
  ],
  login
);

// 🧾 Registro general
router.post(
  '/registro',
  [
    check('nombre', 'El nombre es obligatorio').notEmpty(),
    check('correo', 'El correo es obligatorio').isEmail(),
    check('password')
      .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/)
      .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial'),
    validarCampos
  ],
  registro
);

// 🔍 Verificar si el correo ya existe (asyncValidator desde Angular)
router.post('/verificar-correo', verificarCorreoExistente);


module.exports = router;
