// rutas/servicio.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');
const servicioCtrl = require('../controllers/servicio.controller');
const Servicio = require('../models/Servicio.model');

/* ───────────── Roles ───────────── */
const ROLES = {
  ADMIN: 'admin',
  CLIENTE: 'cliente',
  BARBERO: 'barbero'
};

/* ───────────── Configuración Multer ───────────── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', '..', 'uploads', 'servicios');

    // ✅ Crea la carpeta si no existe
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const mimetype = allowed.test(file.mimetype);
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && ext) {
      return cb(null, true);
    }
    cb(new Error("❌ Solo se permiten imágenes JPG o PNG"));
  }
});

/* ───────────── Rutas de Servicios ───────────── */

// 🔹 Crear servicio (solo admin) con soporte para imágenes
router.post(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  upload.array('imagenes', 5), // ✅ máximo 5 imágenes
  async (req, res) => {
    try {
      const { nombre, descripcion, precio } = req.body;

      // Procesar imágenes si vienen
      const imagenes = req.files
        ? req.files.map(file => `/uploads/servicios/${file.filename}`)
        : [];

      const nuevoServicio = new Servicio({
        nombre,
        descripcion,
        precio,
        imagenes
      });

      await nuevoServicio.save();

      res.status(201).json({
        mensaje: "✅ Servicio creado correctamente",
        servicio: nuevoServicio
      });
    } catch (error) {
      console.error("Error al crear servicio:", error);
      res.status(500).json({ mensaje: "❌ Error al crear servicio" });
    }
  }
);

// 🔹 Obtener todos los servicios (admin, cliente y barbero)
router.get(
  '/',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  servicioCtrl.obtenerServicios
);

// 🔹 Obtener un servicio por ID (todos los roles pueden consultar)
router.get(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN, ROLES.CLIENTE, ROLES.BARBERO),
  servicioCtrl.obtenerServicioPorId
);

// 🔹 Actualizar servicio (solo admin)
router.put(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  servicioCtrl.actualizarServicio
);

// 🔹 Actualizar imágenes de un servicio (solo admin) con multer
router.put(
  '/:id/imagenes',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  upload.array('imagenes', 5),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ mensaje: "❌ No se subieron imágenes" });
      }

      const nuevasImagenes = req.files.map(file => `/uploads/servicios/${file.filename}`);

      const servicio = await Servicio.findByIdAndUpdate(
        id,
        { $push: { imagenes: { $each: nuevasImagenes } } },
        { new: true, upsert: false }
      );

      if (!servicio) {
        return res.status(404).json({ mensaje: "❌ Servicio no encontrado" });
      }

      res.json({
        mensaje: "✅ Imágenes agregadas correctamente",
        servicio,
      });
    } catch (error) {
      console.error("Error al actualizar imágenes:", error);
      res.status(500).json({ mensaje: "❌ Error al actualizar imágenes" });
    }
  }
);

// 🔹 Eliminar servicio (solo admin)
router.delete(
  '/:id',
  validarJWT,
  tieneRol(ROLES.ADMIN),
  servicioCtrl.eliminarServicio
);

module.exports = router;
