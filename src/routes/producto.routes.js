const { Router } = require('express');

const {
   crearProducto,
   obtenerProductos,
   obtenerProducto,
   actualizarProducto,
   eliminarProducto,
   desactivarProducto,
   activarProducto
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

// 🔴 Desactivar producto
router.put('/desactivar/:id', desactivarProducto);

// 🟢 Activar producto
router.put('/activar/:id', activarProducto);

module.exports = router;