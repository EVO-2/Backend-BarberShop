const express = require('express');
const {
  obtenerReporteIngresos,
  obtenerReporteCitasPorBarbero,
  obtenerReporteClientesFrecuentes,
  obtenerReporteInventario,
} = require('../controllers/reportes.controller');
const { validarJWT, verificarRol } = require('../middlewares/validarJWT');

const router = express.Router();

/**
 * =====================================================
 * 📊 RUTAS DE REPORTES — SOLO ACCESO ADMINISTRADOR
 * =====================================================
 */

// 💰 Reporte de ingresos por rango de fechas
router.get(
  '/ingresos',
  validarJWT,
  verificarRol('admin'),
  obtenerReporteIngresos
);

// 💈 Reporte de citas por barbero (rendimiento de barberos)
router.get(
  '/barberos',
  validarJWT,
  verificarRol('admin'),
  obtenerReporteCitasPorBarbero
);

// 👥 Reporte de clientes más frecuentes
router.get(
  '/clientes',
  validarJWT,
  verificarRol('admin'),
  obtenerReporteClientesFrecuentes
);

// 📦 Reporte de inventario (uso o venta de productos)
router.get(
  '/inventario',
  validarJWT,
  verificarRol('admin'),
  obtenerReporteInventario
);

module.exports = router;
