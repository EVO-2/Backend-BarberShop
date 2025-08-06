const { Router } = require('express');
const { body, param } = require('express-validator');

const {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario,
  subirFotoPerfil
} = require('../controllers/usuario.controller');

const validarCampos = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const { emailExiste } = require('../helpers/dbValidators');
const upload = require('../middlewares/uploadFoto');

const router = Router();

// =================== Obtener TODOS los usuarios ===================
router.get('/', [
  validarJWT,
  tieneRol('admin'),
], listarUsuarios);

// =================== Obtener UN usuario por ID ===================
router.get('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  validarCampos
], obtenerUsuarioPorId);

// =================== Crear usuario ===================
router.post('/', [
  validarJWT,
  tieneRol('admin'),
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('correo').isEmail().withMessage('El correo no es válido').custom(emailExiste),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').notEmpty().withMessage('El rol es obligatorio'),
  validarCampos
], crearUsuario);

// =================== Actualizar usuario ===================
router.put('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('correo').optional().isEmail().withMessage('El correo no es válido'),
  body('rol').optional().notEmpty().withMessage('El rol no puede estar vacío'),
  validarCampos
], actualizarUsuario);

// =================== Eliminar usuario (Soft Delete) ===================
router.delete('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  validarCampos
], eliminarUsuario);

// =================== Cambiar estado usuario ===================
router.patch('/actualizar-estado/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  body('estado').isBoolean().withMessage('El estado debe ser booleano'),
  validarCampos
], cambiarEstadoUsuario);

// =================== Subir foto de perfil ===================
router.post('/:id/foto', [
  validarJWT,
  tieneRol('admin', 'cliente', 'barbero'),
  param('id').isMongoId().withMessage('ID inválido'),
  validarCampos,
  upload.single('foto')
], subirFotoPerfil);

module.exports = router;
