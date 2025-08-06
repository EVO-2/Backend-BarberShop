const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const upload = require('../middlewares/uploadFoto');

const {
  obtenerPerfilCliente,
  actualizarPerfilCliente
} = require('../controllers/cliente.controller');

const router = Router();

// 📄 Obtener perfil cliente
router.get('/perfil', validarJWT, obtenerPerfilCliente);

// 🔄 Actualizar perfil cliente (con imagen)
router.put('/perfil', validarJWT, upload.single('foto'), actualizarPerfilCliente);

module.exports = router;
