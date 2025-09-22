// controllers/cita.controller.js
const CitaService = require('../services/cita.service');
const Servicio = require('../models/Servicio.model');
const Cita = require('../models/Cita.model');
const Cliente = require('../models/Cliente.model');

// ===================== Controladores =====================

// Crear nueva cita
const crearCita = async (req, res) => {
  try {
    const { rol, uid } = req; 
    let datosCita = { ...req.body };

    if (rol === 'cliente') {
      const cliente = await Cliente.findOne({ usuario: uid });
      if (!cliente) return res.status(400).json({ mensaje: 'El cliente no está registrado' });
      datosCita.cliente = cliente._id; 
    }

    const cita = await CitaService.crearCita(datosCita);
    return res.status(201).json(cita);
  } catch (error) {
    console.error('❌ Error en crearCita:', error);
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error interno del servidor' });
  }
};

// Obtener todas las citas (admin)
const obtenerCitas = async (_req, res) => {
  try {
    const citas = await CitaService.obtenerCitas();
    return res.json(citas);
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// Obtener todas las citas del usuario logueado
const obtenerMisCitas = async (req, res) => {
  try {
    const { uid, rol } = req;
    const { page = 1, limit = 10, fecha, filtroGeneral } = req.query;

    let rangoFechas;
    if (fecha) {
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);

      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);

      rangoFechas = { inicio: fechaInicio, fin: fechaFin };
    }

    const resultado = await CitaService.obtenerMisCitas({
      uid,
      rol,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      fecha: rangoFechas, // 👈 ya va como rango
      filtroGeneral
    });

    return res.json(resultado);
  } catch (error) {
    console.error('❌ Error en obtenerMisCitas:', error);
    const status = error.status || 500;
    const mensaje = error.message || 'Error al obtener citas';
    return res.status(status).json({ mensaje });
  }
};

// Obtener citas con paginación y filtros (admin)
const obtenerCitasPaginadas = async (req, res) => {
  try {
    const { page = 1, limit = 10, fecha, filtroGeneral } = req.query;

    let rangoFechas;
    if (fecha) {
      const fechaInicio = new Date(fecha);
      fechaInicio.setHours(0, 0, 0, 0);

      const fechaFin = new Date(fecha);
      fechaFin.setHours(23, 59, 59, 999);

      rangoFechas = { inicio: fechaInicio, fin: fechaFin };
    }

    const resultado = await CitaService.obtenerCitasPaginadas({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      fecha: rangoFechas, // 👈 ya va como rango
      filtroGeneral
    });

    return res.json(resultado);
  } catch (error) {
    console.error("❌ Error en obtenerCitasPaginadas:", error);
    return res.status(error.status || 500).json({
      mensaje: error.message || "Error al obtener citas paginadas"
    });
  }
};


// Obtener una cita por ID
const obtenerCitaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await CitaService.obtenerCitaPorId(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    return res.json(cita);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al obtener la cita' });
  }
};

// Actualizar cita (admin/barbero)
const actualizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const citaActualizada = await CitaService.actualizarCita(id, data);
    if (!citaActualizada) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    return res.json(citaActualizada);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al actualizar la cita' });
  }
};

// Reprogramar cita (solo fecha y observación)
const reprogramarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, observacion } = req.body;

    if (!fecha) return res.status(400).json({ message: 'La nueva fecha es obligatoria' });

    const fechaInicio = new Date(fecha);
    const fechaFin = new Date(fechaInicio.getTime() + 45 * 60 * 1000);

    const cita = await Cita.findByIdAndUpdate(
      id,
      {
        fechaInicio,
        fechaFin,
        fecha: fechaInicio.toISOString(),
        fechaBase: fechaInicio.toISOString(),
        ...(observacion !== undefined ? { observacion } : {})
      },
      { new: true }
    ).populate("cliente peluquero sede servicios puestoTrabajo");

    if (!cita) return res.status(404).json({ message: 'Cita no encontrada' });
    res.json(cita);
  } catch (error) {
    console.error('❌ Error reprogramarCita:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const iniciarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { hora } = req.body;

    // Llamada al servicio
    const cita = await CitaService.iniciarCita(id, hora);

    // Retorno uniforme
    return res.json({
      success: true,
      mensaje: 'Cita iniciada correctamente',
      data: cita
    });
  } catch (error) {
    console.error('❌ Error en iniciarCita:', error);
    return res.status(error.status || 500).json({
      success: false,
      mensaje: error.message || 'Error al iniciar la cita'
    });
  }
};

const finalizarCita = async (req, res) => {
  try {
    const { id } = req.params;
    let { hora } = req.body;

    console.log('[finalizarCita] Request Params:', req.params);
    console.log('[finalizarCita] Request Body:', req.body);

    // Validación básica de ID
    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de la cita es requerido'
      });
    }

    // Normalizar hora: si viene null, "", o solo espacios, usar undefined para fecha actual
    if (!hora || typeof hora !== 'string' || hora.trim() === '') {
      hora = undefined;
    } else {
      hora = hora.trim(); // eliminar espacios innecesarios
    }

    console.log('[finalizarCita] Hora normalizada:', hora);

    // Llamada al servicio
    const cita = await CitaService.finalizarCita(id, hora);

    // Retorno uniforme
    return res.json({
      success: true,
      mensaje: 'Cita finalizada correctamente',
      data: cita
    });
  } catch (error) {
    console.error('❌ Error en finalizarCita:', error);

    return res.status(error.status || 500).json({
      success: false,
      mensaje: error.message || 'Error al finalizar la cita'
    });
  }
};



// =========================
// Otros controladores existentes
// =========================
const cancelarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await CitaService.cancelarCita(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    return res.json({ mensaje: 'Cita cancelada exitosamente', cita });
  } catch (error) {
    console.error('❌ Error en cancelarCita:', error);
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al cancelar la cita' });
  }
};

// Obtener citas por sede y fecha
const getCitasPorSedeYFecha = async (req, res) => {
  try {
    const { sedeId, fecha } = req.query;
    if (!sedeId || !fecha) return res.status(400).json({ mensaje: "❌ Falta sedeId o fecha" });

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return res.status(400).json({ mensaje: "❌ Fecha inválida" });

    const inicioDia = new Date(fechaObj); inicioDia.setUTCHours(0, 0, 0, 0);
    const finDia = new Date(fechaObj); finDia.setUTCHours(23, 59, 59, 999);

    const citas = await Cita.find({ sede: sedeId, fecha: { $gte: inicioDia, $lte: finDia } })
      .populate("cliente", "nombre")
      .populate("peluquero", "nombre")
      .populate("servicios", "nombre duracion");

    return res.json({ data: citas });
  } catch (error) {
    console.error("❌ Error en getCitasPorSedeYFecha:", error);
    return res.status(500).json({ mensaje: "❌ Error al obtener citas", error: error.message });
  }
};

// Obtener citas por fecha y hora exacta
const obtenerCitasPorFechaYHora = async (req, res) => {
  try {
    const { fecha, hora } = req.query;
    const citas = await CitaService.obtenerCitasPorFechaYHora(fecha, hora);
    return res.json(citas);
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al obtener citas por fecha y hora' });
  }
};

// Obtener citas por rango
const obtenerCitasPorRango = async (req, res) => {
  try {
    const citas = await CitaService.obtenerCitasPorRango(req.query);
    res.json(citas);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
};

// Obtener todos los servicios activos
const obtenerServicios = async (_req, res) => {
  try {
    const servicios = await Servicio.find({ estado: true }).lean();
    res.json(servicios);
  } catch (error) {
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
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al repetir la cita' });
  }
};

// Pagar cita
const pagarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo } = req.body;
    if (!monto || isNaN(monto) || monto <= 0) return res.status(400).json({ mensaje: 'Monto inválido' });
    if (!metodo || typeof metodo !== 'string') return res.status(400).json({ mensaje: 'Método de pago requerido' });

    const cita = await CitaService.pagarCita(id, monto, metodo);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    return res.json({ mensaje: 'Pago registrado correctamente', cita });
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al pagar la cita' });
  }
};

module.exports = {
  crearCita,
  obtenerCitas,
  obtenerMisCitas,
  obtenerCitasPaginadas,
  obtenerCitaPorId,
  obtenerServicios,
  actualizarCita,
  reprogramarCita,
  iniciarCita,
  cancelarCita,
  finalizarCita,
  getCitasPorSedeYFecha,
  obtenerCitasPorFechaYHora,
  obtenerCitasPorRango,
  repetirCita,
  pagarCita,
};
