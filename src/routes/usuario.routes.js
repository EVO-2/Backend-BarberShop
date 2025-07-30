const { Router } = require('express');
const { body, param } = require('express-validator');
const {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario,
  subirFotoPerfil
} = require('../controllers/usuario.controller');
const validarCampos = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/validarJWT');  
const { tieneRol }   = require('../middlewares/validarRol'); 
const { emailExiste } = require('../helpers/dbValidators');
const upload = require('../middlewares/uploadFoto');

const router = Router();

// Obtener todos los usuarios
router.get('/', [
  validarJWT,
  tieneRol('admin'),
], listarUsuarios);

// Obtener un usuario por ID
router.get('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  validarCampos
], obtenerUsuario);

// Crear usuario
router.post('/', [
  validarJWT,
  tieneRol('admin'),
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('correo').isEmail().withMessage('El correo no es válido').custom(emailExiste),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('rol').notEmpty().withMessage('El rol es obligatorio'),
  validarCampos
], crearUsuario);

// Actualizar usuario
router.put('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  body('nombre').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
  body('correo').optional().isEmail().withMessage('El correo no es válido'),
  body('rol').optional().notEmpty().withMessage('El rol no puede estar vacío'),
  validarCampos
], actualizarUsuario);

// Eliminar usuario
router.delete('/:id', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  validarCampos
], eliminarUsuario);

// Cambiar estado
router.patch('/:id/estado', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  body('estado').isBoolean().withMessage('El estado debe ser booleano'),
  validarCampos
], cambiarEstadoUsuario);

// Subir foto de perfil
router.post('/:id/foto', [
  validarJWT,
  tieneRol('admin', 'cliente', 'barbero'),
  param('id').isMongoId().withMessage('ID inválido'),
  validarCampos,
  upload.single('foto')
], subirFotoPerfil);

router.patch('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Estado actualizado', usuario: usuarioActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar el estado' });
  }
});

module.exports = router;
