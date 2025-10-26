const multer = require('multer');
const path = require('path');
const fs = require('fs');

// === Crear carpeta de destino si no existe ===
const storageDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// === Configuración del almacenamiento ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
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
const limits = { fileSize: 2 * 1024 * 1024 }; // 2MB

// === Configuración general de Multer ===
const upload = multer({ storage, fileFilter, limits });

// === Exportar como middleware reutilizable ===
module.exports = upload;
