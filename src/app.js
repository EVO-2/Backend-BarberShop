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

// Rutas públicas
app.get('/', (req, res) => {
  res.send('API Barbería JEVO en funcionamiento');
});

// Rutas API
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/citas', require('./routes/cita.routes'));
app.use('/api', require('./routes/catalogo.routes')); // sedes, puestos, peluqueros, servicios
app.use('/api/clientes', require('./routes/cliente.routes'));
app.use((req, res, next) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
 

});


module.exports = app;
