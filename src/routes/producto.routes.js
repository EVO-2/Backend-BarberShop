const { Router } = require('express');

const {
   crearProducto,
   obtenerProductos,
   obtenerProducto,
   actualizarProducto,
   eliminarProducto,
   cambiarEstadoProducto,
   subirImagenProducto
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

// 💰 Registrar Venta
router.post('/:id/venta', registrarVentaProducto);

// 🗑️ Eliminar (soft delete)
router.delete('/:id', eliminarProducto);

// 🔄 Cambiar estado (activar/desactivar)
router.patch('/:id/estado', cambiarEstadoProducto);

// 📷 Subir o actualizar imagen del producto
const { createUploadMiddleware } = require('../middlewares/upload');
const uploadProductos = createUploadMiddleware('productos');

router.post(
  '/:id/imagen',
  (req, res, next) => {
    uploadProductos.single('imagen')(req, res, function (err) {
      if (err) {
        console.error('❌ Error de multer/S3 (Productos):', err);
        return res.status(500).json({ mensaje: 'Error al procesar la imagen', error: err.message });
      }
      next();
    });
  },
  subirImagenProducto
);

module.exports = router;