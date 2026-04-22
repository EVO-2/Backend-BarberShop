const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { s3Client, BUCKET_NAME } = require('../config/minio');

// === Configuración del almacenamiento en MinIO ===
const storage = multerS3({
  s3: s3Client,
  bucket: BUCKET_NAME,

  // 🔴 IMPORTANTE: quitar ACL (causa error en MinIO)
  // acl: 'public-read',

  contentType: multerS3.AUTO_CONTENT_TYPE,

  key: function (req, file, cb) {
    try {
      const ext = path.extname(file.originalname);

      // 🔹 Carpeta específica para fotos de perfil
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

      const fileName = `perfiles/${uniqueSuffix}${ext}`;

      cb(null, fileName);
    } catch (error) {
      cb(error);
    }
  }
});

// === Filtro de tipo de archivo ===
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/tiff',
    'image/x-icon'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de imagen no válido. Solo se permiten JPG, PNG, JPEG, WEBP, GIF, BMP, SVG, TIFF o ICO.'));
  }
};

// === Límite de tamaño ===
const limits = {
  fileSize: 2 * 1024 * 1024 // 2MB
};

// === Configuración general de Multer ===
const upload = multer({
  storage,
  fileFilter,
  limits
});

// === Exportar como middleware reutilizable ===
module.exports = upload;