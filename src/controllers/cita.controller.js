// controllers/cita.controller.js

const CitaService = require('../services/cita.service');
const Servicio = require('../models/Servicio.model'); // <--- usado en obtenerServicios

// ===================== controladores =====================

// Crear nueva cita
const crearCita = async (req, res) => {
  try {
    const cita = await CitaService.crearCita(req.body);
    return res.status(201).json(cita);
  } catch (error) {
    console.error('❌ Error al crear cita:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error interno del servidor' });
  }
};

// Obtener todas las citas (admin)
const obtenerCitas = async (_req, res) => {
  try {
    const citas = await CitaService.obtenerCitas();
    return res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas:', error);
    return res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// Obtener citas del usuario logueado
const obtenerMisCitas = async (req, res) => {
  try {
    const { uid, rol } = req;
    const { page = 1, limit = 10, fecha } = req.query;
    const resultado = await CitaService.obtenerMisCitas({
      uid,
      rol,
      page,
      limit,
      fecha,
    });
    return res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtenerMisCitas:', error);
    return res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// Obtener una cita por ID
const obtenerCitaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await CitaService.obtenerCitaPorId(id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    return res.json(cita);
  } catch (error) {
    console.error('❌ Error al obtenerCitaPorId:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error al obtener la cita' });
  }
};

// Actualizar cita
const actualizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const citaActualizada = await CitaService.actualizarCita(id, data);
    if (!citaActualizada) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    return res.json(citaActualizada);
  } catch (error) {
    console.error('❌ Error al actualizarCita:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error al actualizar la cita' });
  }
};

// Cancelar cita
const cancelarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await CitaService.cancelarCita(id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    return res.json({ mensaje: 'Cita cancelada exitosamente', cita });
  } catch (error) {
    console.error('❌ Error al cancelarCita:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error al cancelar la cita' });
  }
};

// Finalizar cita
const finalizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await CitaService.finalizarCita(id);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }
    return res.json({ mensaje: 'Cita finalizada correctamente', cita });
  } catch (error) {
    console.error('❌ Error al finalizarCita:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error al finalizar la cita' });
  }
};

// Obtener citas por sede y fecha
const getCitasPorSedeYFecha = async (req, res) => {
  try {
    const { sedeId, fecha } = req.query;
    const citas = await CitaService.getCitasPorSedeYFecha(sedeId, fecha);
    return res.json(citas);
  } catch (error) {
    console.error('❌ Error en getCitasPorSedeYFecha:', error);
    return res
      .status(error.status || 500)
      .json({
        mensaje: error.message || 'Error al obtener citas por sede y fecha',
      });
  }
};

// Obtener citas por fecha y hora exacta
const obtenerCitasPorFechaYHora = async (req, res) => {
  try {
    const { fecha, hora } = req.query;
    const citas = await CitaService.obtenerCitasPorFechaYHora(fecha, hora);
    return res.json(citas);
  } catch (error) {
    console.error('❌ Error en obtenerCitasPorFechaYHora:', error);
    return res
      .status(error.status || 500)
      .json({
        mensaje: error.message || 'Error al obtener citas por fecha y hora',
      });
  }
};

// Obtener citas por rango
const obtenerCitasPorRango = async (req, res) => {
  try {
    const citas = await CitaService.obtenerCitasPorRango(req.query);
    res.json(citas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener todos los servicios activos
const obtenerServicios = async (_req, res) => {
  try {
    const servicios = await Servicio.find({ estado: true }).lean();
    res.json(servicios);
  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({ message: 'Error al obtener servicios' });
  }
};

// Repetir cita
const repetirCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha } = req.body;
    const nuevaCita = await CitaService.repetirCita(id, fecha);
    return res.status(201).json(nuevaCita);
  } catch (error) {
    console.error('❌ Error al repetirCita:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error al repetir la cita' });
  }
};

// Pagar cita
const pagarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo } = req.body;

    // Validaciones mínimas
    if (!monto || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: 'Monto inválido' });
    }
    if (!metodo || typeof metodo !== 'string') {
      return res.status(400).json({ mensaje: 'Método de pago requerido' });
    }

    const cita = await CitaService.pagarCita(id, monto, metodo);
    if (!cita) {
      return res.status(404).json({ mensaje: 'Cita no encontrada' });
    }

    return res.json({ mensaje: 'Pago registrado correctamente', cita });
  } catch (error) {
    console.error('❌ Error al pagarCita:', error);
    return res
      .status(error.status || 500)
      .json({ mensaje: error.message || 'Error al pagar la cita' });
  }
};

module.exports = {
  crearCita,
  obtenerCitas,
  obtenerMisCitas,
  obtenerCitaPorId,
  obtenerServicios,
  actualizarCita,
  cancelarCita,
  finalizarCita,
  getCitasPorSedeYFecha,
  obtenerCitasPorFechaYHora,
  obtenerCitasPorRango,
  repetirCita,
  pagarCita,
};
