const express = require('express');
const router = express.Router();
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');

const citaController = require('../controllers/cita.controller'); 

const {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  getCitasPorRol,
  finalizarCita 
} = citaController;

// 🔐 Obtener las citas según el rol autenticado (cliente, barbero o admin)
router.get('/mis-citas', validarJWT, tieneRol('cliente', 'barbero', 'admin'), async (req, res) => {
  const { rol, uid } = req;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { fecha, estado } = req.query;
  let filtro = {};

  try {
    if (rol === 'cliente') {
      const cliente = await require('../models/Cliente.model').findOne({ usuario: uid });
      if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
      filtro.cliente = cliente._id;
    } else if (rol === 'barbero') {
      const peluquero = await require('../models/Peluquero.model').findOne({ usuario: uid });
      if (!peluquero) return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
      filtro.peluquero = peluquero._id;
    }

    if (fecha) {
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);
      filtro.fecha = { $gte: fechaInicio, $lte: fechaFin };
    }

    if (estado) {
      filtro.estado = estado;
    }

    const Cita = require('../models/Cita.model');
    const total = await Cita.countDocuments(filtro);
    const citas = await Cita.find(filtro)
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo foto' }
      })
      .populate({
        path: 'peluquero',
        populate: { path: 'usuario', select: 'nombre correo foto' }
      })
      .populate('servicios sede puestoTrabajo pago');

    res.json({
      total,
      pagina: page,
      totalPaginas: Math.ceil(total / limit),
      citas
    });
  } catch (error) {
    console.error('❌ Error en /mis-citas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
});

/* ───────────── Rutas protegidas por rol ───────────── */

// Admin y barbero: vista general de citas relacionadas
router.get('/citas-por-rol', validarJWT, tieneRol('admin', 'barbero'), getCitasPorRol);

// Admin: ver todas las citas
router.get('/', validarJWT, tieneRol('admin'), obtenerCitas);

// Admin: obtener cita por ID
router.get('/:id', validarJWT, tieneRol('admin'), obtenerCitaPorId);

// Admin y cliente: crear nueva cita
router.post('/', validarJWT, tieneRol('admin', 'cliente'), crearCita);

// Admin: actualizar cita
router.put('/:id', validarJWT, tieneRol('admin'), actualizarCita);

// Cliente, barbero y admin: cancelar cita
router.put('/cancelar/:id', validarJWT, tieneRol('cliente', 'barbero', 'admin'), cancelarCita);

// Barbero: finalizar cita
router.put('/:id/finalizar', validarJWT, tieneRol('barbero'), citaController.finalizarCita);


module.exports = router;
