const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware globales
app.use(cors());
app.use(express.json()); // Ya incluye body-parser

// Conexión a base de datos (Sequelize)
const { poolConnect } = require('./config/db');

// Rutas base
app.get('/', (req, res) => {
  res.send('API funcionando 🚀');
});

// Rutas API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));

// Puerto
const PORT = process.env.PORT || 3000;

// Iniciar servidor después de conexión a DB
poolConnect
  .then(() => {
    console.log('✅ Conexión a la base de datos establecida');
    app.listen(PORT, () => {
      console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al conectar con la base de datos:', err.message);
  });
