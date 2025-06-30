const { body, validationResult } = require('express-validator');

// Validaciones para crear usuario
const validarUsuario = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 3 }).withMessage('El nombre debe tener al menos 3 caracteres'),

  body('correo')
    .trim()
    .notEmpty().withMessage('El correo es obligatorio')
    .isEmail().withMessage('Debe proporcionar un correo válido'),

  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

  body('rol')
    .notEmpty().withMessage('El rol es obligatorio'),
];

const manejarErrores = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({
      errores: errores.array().map(err => err.msg)
    });
  }
  next();
};

module.exports = {
  validarUsuario,
  manejarErrores
};
