require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// 📁 Servir archivos estáticos (imágenes de perfil)
app.use('/uploads', express.static('uploads'));

// Conexión a la base de datos
conectarDB();


const rolRoutes = require('./routes/rol.routes');
const sedeRoutes = require('./routes/sede.routes');
const puestoRoutes = require('./routes/puesto.routes');

// Rutas
app.get('/', (req, res) => {
  res.send('API Barbería JEVO en funcionamiento');
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/roles', rolRoutes); 
app.use('/api/usuarios', require('./routes/usuario.routes'));
app.use('/api/citas', require('./routes/cita.routes'));
app.use('/api', require('./routes/catalogo.routes'));
app.use('/api/clientes', require('./routes/cliente.routes'));
app.use('/api/sedes', sedeRoutes);
app.use('/api/puestos', puestoRoutes);

// Middleware para manejar rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

module.exports = app;
