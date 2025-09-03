const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const upload = require('../middlewares/uploadFoto');

const {
  crearPeluquero,
  obtenerPeluqueros,
  obtenerPeluqueroPorId,
  actualizarPeluquero,
  desactivarPeluquero,
  activarPeluquero,
  obtenerPerfilPeluquero,
  actualizarPerfilPeluquero
} = require('../controllers/peluquero.controller');

// ✅ Todas las rutas protegidas con JWT
router.use(validarJWT);

/* ───────────── Endpoints de PERFIL ───────────── */

// 📄 Obtener perfil del peluquero autenticado
router.get('/perfil', async (req, res) => {
  try {
    console.log('Solicitud GET /api/peluqueros/perfil - usuario:', req.usuarioId);
    await obtenerPerfilPeluquero(req, res);
  } catch (err) {
    console.error('❌ Error al obtener perfil del peluquero:', err);
    res.status(500).json({ ok: false, msg: 'Error al obtener perfil del peluquero' });
  }
});

// 🔄 Actualizar perfil peluquero (incluyendo foto)
router.put('/perfil', upload.single('foto'), async (req, res) => {
  try {
    console.log('Solicitud PUT /api/peluqueros/perfil - usuario:', req.usuarioId);
    await actualizarPerfilPeluquero(req, res);
  } catch (err) {
    console.error('❌ Error al actualizar perfil del peluquero:', err);
    res.status(500).json({ ok: false, msg: 'Error al actualizar perfil del peluquero' });
  }
});

/* ───────────── CRUD de Peluquero ───────────── */

// Crear peluquero
router.post('/', crearPeluquero);

// Listar todos los peluqueros
router.get('/', obtenerPeluqueros);

// Obtener peluquero por ID
router.get('/:id', obtenerPeluqueroPorId);

// Actualizar peluquero (admin)
router.put('/:id', actualizarPeluquero);

// Desactivar peluquero y liberar puesto
router.put('/desactivar/:id', desactivarPeluquero);

// Activar peluquero
router.put('/activar/:id', activarPeluquero);

module.exports = router;
