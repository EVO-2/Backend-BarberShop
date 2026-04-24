const { Router } = require('express');

const {
   crearProducto,
   obtenerProductos,
   obtenerProducto,
   actualizarProducto,
   eliminarProducto,
   cambiarEstadoProducto
} = require('../controllers/producto.controller');

const { validarJWT } = require('../middlewares/validarJWT');
// ❌ quitamos verificarPermiso

const router = Router();

/* =========================
   🔐 Middleware global
========================= */
router.use(validarJWT);

/* =========================
   📦 CRUD PRODUCTOS
========================= */

// ➕ Crear producto
router.post('/', crearProducto);

// 📋 Obtener todos
router.get('/', obtenerProductos);

// 📌 Obtener uno por ID
router.get('/:id', obtenerProducto);

// ✏️ Actualizar
router.put('/:id', actualizarProducto);

// 🗑️ Eliminar (soft delete)
router.delete('/:id', eliminarProducto);

// 🔄 Cambiar estado (activar/desactivar)
router.patch('/:id/estado', cambiarEstadoProducto);

module.exports = router;