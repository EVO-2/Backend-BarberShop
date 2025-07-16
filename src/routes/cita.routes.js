const express = require('express');
const router = express.Router();

const {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita
} = require('../controllers/cita.controller');

const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');

// 🔐 Listar solo las citas del cliente, barbero o admin autenticado (con paginación)
  router.get('/mis-citas', validarJWT, tieneRol('cliente', 'barbero', 'admin'), async (req, res) => {
    const { rol, uid } = req;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { fecha, estado } = req.query;
    let filtro = {};

    try {
      // Asignar filtro por rol
      if (rol === 'cliente') {
        const cliente = await require('../models/Cliente.model').findOne({ usuario: uid });
        if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        filtro.cliente = cliente._id;

      } else if (rol === 'barbero') {
        const peluquero = await require('../models/Peluquero.model').findOne({ usuario: uid });
        if (!peluquero) return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
        filtro.peluquero = peluquero._id;
      }

      // Filtro por fecha (formato: yyyy-MM-dd)
      if (fecha) {
        const fechaInicio = new Date(fecha);
        fechaInicio.setHours(0, 0, 0, 0);

        const fechaFin = new Date(fecha);
        fechaFin.setHours(23, 59, 59, 999);

        filtro.fecha = { $gte: fechaInicio, $lte: fechaFin };
      }

      // Filtro por estado
      if (estado) {
        filtro.estado = estado;
      }

      const Cita = require('../models/Cita.model');
      const total = await Cita.countDocuments(filtro);

      const citas = await Cita.find(filtro)
        .sort({ fecha: -1 })
        .skip(skip)
        .limit(limit)
        .populate('cliente', 'usuario')
        .populate('peluquero', 'usuario')
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


/* ───────────── Rutas restantes ───────────── */

// Crear cita (admin o cliente)
router.post('/', validarJWT, tieneRol('admin', 'cliente'), crearCita);

// Obtener todas las citas (solo admin)
router.get('/', validarJWT, tieneRol('admin'), obtenerCitas);

// Obtener cita por ID (solo admin)
router.get('/:id', validarJWT, tieneRol('admin'), obtenerCitaPorId);

// Actualizar cita (solo admin)
router.put('/:id', validarJWT, tieneRol('admin'), actualizarCita);

// Cancelar cita (cliente, barbero o admin)
router.put('/cancelar/:id', validarJWT, tieneRol('cliente', 'barbero', 'admin'), cancelarCita);

module.exports = router;
