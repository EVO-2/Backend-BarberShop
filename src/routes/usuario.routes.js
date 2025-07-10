const { Router } = require('express');
const { body, param } = require('express-validator');
const {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario
} = require('../controllers/usuario.controller');
const validarCampos = require('../middlewares/validarCampos');
const validarJWT = require('../middlewares/validarJWT');
const tieneRol = require('../middlewares/validarRol');
const { emailExiste } = require('../helpers/dbValidators');

const router = Router();

/**
 * @route   GET /api/usuarios
 * @desc    Obtener todos los usuarios (solo admin)
 */
router.get('/', [
  validarJWT,
  tieneRol('admin'),
], listarUsuarios);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Obtener un usuario por ID (solo admin)
 */
router.get('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  validarCampos
], obtenerUsuario);

/**
 * @route   POST /api/usuarios
 * @desc    Crear un nuevo usuario (solo admin)
 */
router.post('/', [
  validarJWT,
  tieneRol('admin'),
  body('nombre')
    .notEmpty().withMessage('El nombre es obligatorio'),
  body('correo')
    .isEmail().withMessage('El correo no es válido')
    .custom(emailExiste),
  body('password')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol')
    .notEmpty().withMessage('El rol es obligatorio'),
  validarCampos
], crearUsuario);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Actualizar un usuario por ID (solo admin)
 */
router.put('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('correo').optional().isEmail().withMessage('El correo no es válido'),
  body('rol').optional().notEmpty().withMessage('El rol no puede estar vacío'),
  validarCampos
], actualizarUsuario);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Desactivar (soft delete) un usuario (solo admin)
 */
router.delete('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  validarCampos
], eliminarUsuario);

module.exports = router;
