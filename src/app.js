// ======================= Imports =======================
const express = require('express');
const cors = require('cors');
const path = require('path');

// ======================= Rutas =======================
const rolRoutes = require('./routes/rol.routes');
const sedeRoutes = require('./routes/sede.routes');
const puestoRoutes = require('./routes/puesto.routes');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const clienteRoutes = require('./routes/cliente.routes');
const peluqueroRoutes = require('./routes/peluquero.routes');
const citaRoutes = require('./routes/cita.routes');
const catalogoRoutes = require('./routes/catalogo.routes');
const pagoRoutes = require('./routes/pago');
const servicioRoutes = require('./routes/servicio.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportesRoutes = require('./routes/reportes.routes');
const equipoRoutes = require('./routes/equipo.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// =================== Middlewares ===================

// Configuración CORS
const corsOptions = {
  origin: '*', // ⚠️ En producción debes limitar dominios
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
};

app.use(cors(corsOptions));

// Parseo de JSON
app.use(express.json());

// Parseo de formularios
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (imágenes, uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =================== Ruta raíz ===================
app.get('/', (req, res) => {
  res.send('✅ API Barbería JEVO en funcionamiento');
});

// =================== Rutas API ===================
app.use('/api/auth', authRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/peluqueros', peluqueroRoutes);
app.use('/api/citas', citaRoutes);
app.use('/api/sedes', sedeRoutes);
app.use('/api/puestos', puestoRoutes);
app.use('/api', catalogoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/equipos', equipoRoutes);
app.use('/api/dashboard', dashboardRoutes);

// =================== Manejo de errores 404 ===================
app.use((req, res, next) => {
  res.status(404).json({
    ok: false,
    mensaje: '❌ Ruta no encontrada'
  });
});

module.exports = app;