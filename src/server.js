require('dotenv').config();

const express = require('express');
const app = express();

// 👉 Para servir archivos estáticos (como las fotos subidas)
app.use('/uploads', express.static('uploads'));

// 👉 Importa y usa tu app principal (rutas, middlewares, etc.)
const mainApp = require('./app');
app.use(mainApp);

// 👉 Puerto desde .env o por defecto 3000
const PORT = process.env.PORT || 3000;

// 👉 Levantar el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
