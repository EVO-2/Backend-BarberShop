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
router.get('/perfil', validarJWT, async (req, res) => {
  try {
    console.log('Solicitud GET /api/clientes/perfil - usuario:', req.usuarioId);
    await obtenerPerfilCliente(req, res);
  } catch (err) {
    console.error('Error al obtener perfil del cliente:', err);
    res.status(500).json({ ok: false, msg: 'Error al obtener perfil del cliente' });
  }
});

// 🔄 Actualizar perfil cliente (incluyendo foto)
router.put('/perfil', validarJWT, upload.single('foto'), async (req, res) => {
  try {
    console.log('Solicitud PUT /api/clientes/perfil - usuario:', req.usuarioId);
    await actualizarPerfilCliente(req, res);
  } catch (err) {
    console.error('Error al actualizar perfil del cliente:', err);
    res.status(500).json({ ok: false, msg: 'Error al actualizar perfil del cliente' });
  }
});

router.get('/', validarJWT, obtenerClientes);

module.exports = router;
