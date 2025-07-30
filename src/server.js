require('dotenv').config();

const express = require('express');
const path = require('path'); // ✅ necesario para construir rutas absolutas
const app = express();

// 👉 Servir archivos estáticos (como imágenes de perfil)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 👉 Importa y usa tu app principal (rutas, middlewares, etc.)
const mainApp = require('./app');
app.use(mainApp);

// 👉 Puerto desde .env o por defecto 3000
const PORT = process.env.PORT || 3000;

// 👉 Levantar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
