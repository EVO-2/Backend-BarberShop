require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conectar DB
conectarDB();

// Rutas
app.get('/', (req, res) => {
  res.send('API Barbería JEVO en funcionamiento');
});

// Ruta de usuarios
const usuarioRoutes = require('./routes/usuario.routes');
app.use('/api/usuarios', usuarioRoutes);
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);
const citaRoutes = require('./routes/cita.routes');
app.use('/api/citas', citaRoutes);


module.exports = app;
