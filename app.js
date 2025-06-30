const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware para CORS y JSON
app.use(cors());
app.use(express.json()); 
app.use(bodyParser.json()); 

// Rutas
app.get('/', (req, res) => {
  res.send('API funcionando 🚀');
});

const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);

const usuariosRoutes = require('./routes/usuarios.routes');
app.use('/api/usuarios', usuariosRoutes);

// Conexión DB
const { poolConnect } = require('./config/db');
const PORT = process.env.PORT || 3000;

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
