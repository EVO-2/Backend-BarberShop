// ======================= Imports =======================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conectarDB = require('./config/db');

const rolRoutes       = require('./routes/rol.routes');
const sedeRoutes      = require('./routes/sede.routes');
const puestoRoutes    = require('./routes/puesto.routes');
const authRoutes      = require('./routes/auth.routes');
const usuarioRoutes   = require('./routes/usuario.routes');
const clienteRoutes   = require('./routes/cliente.routes');
const peluqueroRoutes = require('./routes/peluquero.routes');
const citaRoutes      = require('./routes/cita.routes');
const catalogoRoutes  = require('./routes/catalogo.routes');
const pagoRoutes      = require('./routes/pago'); 

const app = express();

// =================== Conexión DB ===================
conectarDB();

// =================== Middlewares ===================
app.use(cors());
app.use(express.json());

// Servir imágenes de perfil u otros archivos estáticos
app.use('/uploads', express.static('uploads'));

// =================== Rutas ===================
app.get('/', (req, res) => {
  res.send('✅ API Barbería JEVO en funcionamiento');
});

app.use('/api/auth',      authRoutes);
app.use('/api/roles',     rolRoutes);
app.use('/api/usuarios',  usuarioRoutes);
app.use('/api/clientes',  clienteRoutes);
app.use('/api/peluqueros', peluqueroRoutes);
app.use('/api/citas',     citaRoutes);
app.use('/api/sedes',     sedeRoutes);
app.use('/api/puestos',   puestoRoutes);
app.use('/api',           catalogoRoutes); 
app.use('/api/pagos',     pagoRoutes);     

// ============ Manejo de Rutas no encontradas ============
app.use((req, res, next) => {
  res.status(404).json({ mensaje: '❌ Ruta no encontrada' });
});

module.exports = app;
