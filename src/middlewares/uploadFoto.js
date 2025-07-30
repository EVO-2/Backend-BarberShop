const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear carpeta de destino si no existe
const storageDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  }
});

// Filtro de tipo de archivo
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
    cb(new Error('Formato de imagen no válido. Solo se permite JPG, PNG, JPEG o WEBP.'));
  }
};

// Límite de tamaño: 2MB
const limits = {
  fileSize: 2 * 1024 * 1024 // 2MB
};

const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = upload;
