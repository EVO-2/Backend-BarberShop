const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { s3Client, BUCKET_NAME } = require('../config/minio');

// === Filtro de tipo de archivo ===
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'image/gif', 'image/bmp', 'image/svg+xml', 'image/tiff', 'image/x-icon'
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

/**
 * Crea un middleware de multer dinámico para MinIO
 * @param {string} folder Nombre de la carpeta en MinIO (ej: 'perfiles', 'productos')
 */
const createUploadMiddleware = (folder) => {
  const storage = multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      try {
        const ext = path.extname(file.originalname);
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const fileName = `${folder}/${uniqueSuffix}${ext}`;
        cb(null, fileName);
      } catch (error) {
        cb(error);
      }
    }
  });

  return multer({
    storage,
    fileFilter,
    limits
  });
};

module.exports = {
  createUploadMiddleware
};
