const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const upload = require('../middlewares/uploadFoto');

const {
  crearPeluquero,
  obtenerPeluqueros,
  obtenerPeluqueroPorId,
  actualizarPeluquero,
  desactivarPeluquero,
  activarPeluquero,
  obtenerPerfilPeluquero,
  // actualizarPerfilPeluquero
} = require('../controllers/peluquero.controller');

// ✅ Todas las rutas protegidas con JWT
router.use(validarJWT);

/* ───────────── Endpoints de PERFIL (solo peluquero) ───────────── */

// 📄 Obtener perfil del peluquero autenticado
router.get('/perfil', tieneRol('peluquero'), obtenerPerfilPeluquero);

/* 🔄 Actualizar perfil peluquero (incluyendo foto)
router.put(
  '/perfil',
  tieneRol('peluquero'),
  upload.single('foto'),
  actualizarPerfilPeluquero
);
*/

/* ───────────── CRUD de Peluquero (solo admin) ───────────── */

// Crear peluquero
router.post('/', tieneRol('admin'), crearPeluquero);

// Listar todos los peluqueros
router.get('/', tieneRol('admin'), obtenerPeluqueros);

// Obtener peluquero por ID
router.get('/:id', tieneRol('admin'), obtenerPeluqueroPorId);

// Actualizar peluquero
router.put('/:id', tieneRol('admin'), actualizarPeluquero);

// Desactivar peluquero y liberar puesto
router.put('/desactivar/:id', tieneRol('admin'), desactivarPeluquero);

// Activar peluquero
router.put('/activar/:id', tieneRol('admin'), activarPeluquero);

module.exports = router;
