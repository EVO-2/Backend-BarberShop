// ======================= Imports =======================
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

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
const productoRoutes = require('./routes/producto.routes');
const proveedorRoutes = require('./routes/proveedor.routes');
const categoriaRoutes = require('./routes/categoria.routes');
const suscripcionesRoutes = require('./routes/suscripciones.routes');
const onboardingRoutes = require('./routes/onboarding.routes');

// 🔥 NUEVA RUTA (PERMISOS)
const permisosRoutes = require('./routes/permisos.routes');
const historialRoutes = require('./routes/historial.routes');

// =================== Middlewares ===================

// 🔥 Lista de orígenes permitidos (dev + móvil + producción)
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost',
  'capacitor://localhost',
  'ionic://localhost',
  'http://192.168.1.17:8100',
  'http://192.168.1.17:4200',
  // 👉 PRODUCCIÓN
  'https://frontend-barber-shop-git-master-evo6.vercel.app',
  process.env.FRONTEND_URL
];



// 🔥 Configuración CORS dinámica (PRO)
const corsOptions = {
  origin: function (origin, callback) {

    // Permitir herramientas como Postman o apps móviles sin origin
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    } else {
      console.warn('❌ CORS bloqueado para origen:', origin);
      return callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
};

// ✅ CORS correcto
app.use(cors(corsOptions));

// =================== Parsers ===================
app.use(express.json());

// =================== Archivos estáticos ===================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =================== Ruta raíz ===================
app.get('/', (req, res) => {
  res.send('✅ API Barbería JEVO en funcionamiento');
});

// 🔥 RUTA DE PRUEBA RÁPIDA PARA REPORTE DIARIO
app.get('/debug/reporte-diario', async (req, res) => {
  try {
    const { enviarReporteDiario } = require('./schedulers/reporteDiario.scheduler');
    await enviarReporteDiario();
    res.json({ mensaje: 'Reporte diario ejecutado y enviado al correo (Revisa tu bandeja de entrada)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
app.use('/api', catalogoRoutes); // ⚠️ revisar si aquí ya existen categorías
app.use('/api/pagos', pagoRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/equipos', equipoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/permisos', permisosRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/empresa', require('./routes/empresa.routes'));
app.use('/api/wompi', require('./routes/wompi.routes'));
app.use('/api/whatsapp', require('./routes/whatsapp.routes'));

// =================== Manejo de errores 404 ===================
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    mensaje: '❌ Ruta no encontrada'
  });
});

module.exports = app;