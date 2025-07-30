// src/routes/auth.routes.js
const { Router } = require('express');
const { check } = require('express-validator');
const {
  login,
  registro,
  obtenerPerfil,
  actualizarPerfil,
  obtenerPerfilPeluquero,
  actualizarPerfilPeluquero
} = require('../controllers/auth.controller');
const validarCampos = require('../middlewares/validarCampos');
const { validarJWT } = require('../middlewares/validarJWT');
const upload = require('../middlewares/uploadFoto'); 

const router = Router();

// 🔐 Login
router.post('/login', [
  check('correo', 'El correo es obligatorio').isEmail(),
  check('password', 'La contraseña es obligatoria').notEmpty(),
  validarCampos
], login);

// 🧾 Registro general
router.post('/registro', [
  check('nombre', 'El nombre es obligatorio').notEmpty(),
  check('correo', 'El correo es obligatorio').isEmail(),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  validarCampos
], registro);

// 👤 Perfil de Usuario (general: cliente o peluquero)
router.get('/perfil', validarJWT, obtenerPerfil);

// ✅ Actualizar perfil con foto (cliente o peluquero)
router.put('/perfil', validarJWT, upload.single('foto'), actualizarPerfil);

// ✂️ Perfil extendido de peluquero
router.get('/peluquero', validarJWT, obtenerPerfilPeluquero);

// ✂️ Actualizar perfil extendido de peluquero (incluye imagen)
router.put('/peluquero', validarJWT, upload.single('foto'), actualizarPerfilPeluquero);

module.exports = router;
