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
const { validarJWT } = require('../middlewares/validarJWT');  
const { tieneRol }   = require('../middlewares/validarRol'); 
const { emailExiste } = require('../helpers/dbValidators');
const upload = require('../middlewares/uploadFoto');

// ✅ Importa directamente el modelo correcto
const Usuario = require('../models/Usuario.model');

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

// ✅ Cambiar estado (activo/inactivo)
router.patch('/:id/estado', [
  validarJWT,
  tieneRol('admin'),
  param('id').isMongoId().withMessage('El ID no es válido'),
  body('estado').isBoolean().withMessage('El estado debe ser booleano'),
  validarCampos
], async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const usuario = await Usuario.findById(id); // ← CORREGIDO: era findByPk
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    usuario.estado = estado;
    await usuario.save();

    res.json({ mensaje: 'Estado actualizado correctamente', usuario });
  } catch (error) {
    console.error('❌ Error al actualizar el estado:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el estado del usuario' });
  }
});

// Ruta para subir la foto de perfil
router.post('/:id/foto', [
  validarJWT,
  tieneRol('admin', 'cliente', 'barbero'), // todos los roles pueden cambiar su foto
  param('id').isMongoId().withMessage('ID inválido'),
  validarCampos,
  upload.single('foto') // usa el middleware de multer
], async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Guardar ruta de la imagen en el usuario
    usuario.foto = `uploads/${req.file.filename}`;
    await usuario.save();

    res.json({ mensaje: 'Foto actualizada correctamente', foto: usuario.foto });

  } catch (error) {
    console.error('❌ Error al subir la foto:', error);
    res.status(500).json({ mensaje: 'Error al subir la foto', error: error.message });
  }
});


module.exports = router;
