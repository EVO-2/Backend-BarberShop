// ===============================================
// RUTAS DE SERVICIOS - Backend BarberShop
// ===============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const servicioCtrl = require('../controllers/servicio.controller');

// ============================================================
// Definición de Roles
// ============================================================
const ROLES = {
  ADMIN: 'admin',
  CLIENTE: 'cliente',
  BARBERO: 'barbero'
};

// ============================================================
// Configuración de Multer para subir imágenes de servicios
// ============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'servicios');

    // ✅ Crea la carpeta si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const mimetype = allowed.test(file.mimetype);
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && ext) return cb(null, true);
    cb(new Error('❌ Solo se permiten imágenes JPG o PNG'));
  }
});

// ============================================================
// RUTAS DE SERVICIO
// ============================================================

// 🔹 Crear servicio (solo admin)
router.post(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  upload.array('imagenes', 5),
  servicioCtrl.crearServicio
);

// 🔹 Obtener todos los servicios (admin, cliente y barbero)
router.get(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  servicioCtrl.obtenerServicios
);

// 🔹 Obtener un servicio por ID (disponible para todos los roles)
router.get(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  servicioCtrl.obtenerServicioPorId
);

// 🔹 Actualizar servicio completo (solo admin)
router.put(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  upload.array('imagenes', 5),
  servicioCtrl.actualizarServicio
);

// ✅ Cambiar estado de un servicio (activar/desactivar)
router.patch(
  '/:id/estado',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  servicioCtrl.cambiarEstadoServicio
);

// ============================================================
// Middleware de manejo de errores de multer (opcional, elegante)
// ============================================================
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ mensaje: `❌ Error de carga: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ mensaje: `❌ ${err.message}` });
  }
  next();
});

module.exports = router;
