const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const upload = require('../middlewares/uploadFoto');
const {
  obtenerPerfilCliente,
  actualizarPerfilCliente,
  obtenerClientes,
} = require('../controllers/cliente.controller');

const router = Router();

/* ───────────── Rutas para Cliente ───────────── */

// 📄 Obtener perfil del cliente autenticado
router.get('/perfil', validarJWT, obtenerPerfilCliente);

// 🔄 Actualizar perfil cliente (incluyendo foto)
router.put(
  '/perfil',
  validarJWT,
  upload.single('foto'),
  actualizarPerfilCliente
);

// 📄 Obtener todos los clientes (solo admins/barberos según roles)
router.get('/', validarJWT, obtenerClientes);

module.exports = router;
