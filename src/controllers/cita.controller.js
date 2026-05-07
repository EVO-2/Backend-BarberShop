const CitaService = require('../services/cita.service');
const Servicio = require('../models/Servicio.model');
const Cita = require('../models/Cita.model');
const Cliente = require('../models/Cliente.model');
const NotificationService = require('../services/notification.service');
const { programarRecordatorio } = require('../schedulers/recordatorio.scheduler');
const { pagarCita: pagarCitaService } = require('../services/cita.service');
const { MetodosPago, Mensajes } = require('../constants');
const HistorialService = require('../services/historial.service');



// ===================== Controladores =====================

// Crear nueva cita
const crearCita = async (req, res) => {
  try {
    const { rol, uid } = req;
    let datosCita = { ...req.body };

    // ================= VALIDACIONES =================
    if (!datosCita.fecha) {
      return res.status(400).json({ mensaje: 'La fecha de la cita es obligatoria' });
    }

    const fechaCita = new Date(datosCita.fecha);
    const ahora = new Date();

    if (isNaN(fechaCita.getTime())) {
      return res.status(400).json({ mensaje: 'Formato de fecha inválido' });
    }

    if (fechaCita.getTime() < ahora.getTime() - 60000) {
      return res.status(400).json({ mensaje: 'No puedes crear una cita con fecha u hora pasada' });
    }

    // ================= CLIENTE =================
    let clienteData = null;

    if (datosCita.cliente) {
      clienteData = await Cliente.findById(datosCita.cliente)
        .populate('usuario', 'nombre correo telefono');
        
      if (!clienteData) {
        clienteData = await Cliente.findOne({ usuario: datosCita.cliente })
          .populate('usuario', 'nombre correo telefono');
      }
    } 
    
    if (!clienteData && rol === 'cliente') {
      clienteData = await Cliente.findOne({ usuario: uid })
        .populate('usuario', 'nombre correo telefono');
    }

    if (clienteData) {
      datosCita.cliente = clienteData._id;
    } else {
      return res.status(400).json({ mensaje: 'Cliente no válido' });
    }

    // ================= CREAR CITA =================
    const cita = await CitaService.crearCita(datosCita);

    // ================= PREPARAR DATOS =================
    const servicios = cita.servicios?.map(s => s.nombre).join(', ') || 'Servicio no definido';

    const user = clienteData?.usuario;

    const fechaObj = new Date(cita.fecha);

    const fechaFormateada = fechaObj.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const horaFormateada = fechaObj.toLocaleTimeString('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";

    // ================= PAYLOAD BASE =================
    const payload = user ? {
      nombre: user.nombre,
      correo: user.correo,
      telefono: clienteData?.telefono,
      citaId: cita._id,
      fecha: fechaFormateada,
      hora: horaFormateada,
      servicios,
      turno: cita.turno,
      url: `${frontendUrl}/mis-citas/${cita._id}`
    } : null;

    // ================= NOTIFICACIÓN INMEDIATA =================
    if (payload) {
      NotificationService.notify('CITA_CREADA', payload)
        .catch(err => console.error('Error notificación creación:', err.message));
    }

    // ================= RECORDATORIO PROGRAMADO =================
    if (payload) {
      programarRecordatorio(cita)
        .then(() => {
          console.log(`⏰ Recordatorio programado para cita ${cita._id}`);
        })
        .catch(err => {
          console.error('Error programando recordatorio:', err.message);
        });
    }

    // ================= AUDITORÍA =================
    HistorialService.registrarAccion({
      usuario: uid,
      accion: 'CREAR',
      modulo: 'CITAS',
      descripcion: `Creó una nueva cita para el cliente ${clienteData?.usuario?.nombre || 'Desconocido'}`,
      entidadId: cita._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    // ================= RESPONSE =================
    return res.status(201).json(cita);

  } catch (error) {
    console.error('❌ Error crítico en crearCita:', error);
    return res.status(error.status || 500).json({
      mensaje: error.message || 'Error interno del servidor',
      stack: error.stack
    });
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
      try {
        const parsed = JSON.parse(fecha);
        if (parsed.inicio && parsed.fin) {
          rangoFechas = {
            inicio: new Date(parsed.inicio),
            fin: new Date(parsed.fin)
          };
        }
      } catch { }
    }

    const resultado = await CitaService.obtenerMisCitas({
      uid,
      rol,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      fecha: rangoFechas,
      filtroGeneral
    });

    return res.json(resultado);
  } catch (error) {
    const status = error.status || 500;
    const mensaje = error.message || "Error al obtener citas";
    return res.status(status).json({ mensaje });
  }
};

// Obtener citas con paginación y filtros (admin)
const obtenerCitasPaginadas = async (req, res) => {
  try {
    const { page = 1, limit = 10, fecha, filtroGeneral } = req.query;

    let rangoFechas;
    if (fecha) {
      try {
        const parsed = JSON.parse(fecha);
        if (parsed.inicio && parsed.fin) {
          const inicio = new Date(parsed.inicio);
          const fin = new Date(parsed.fin);

          inicio.setHours(inicio.getHours() - 5);
          fin.setHours(fin.getHours() - 5);

          rangoFechas = { inicio, fin };
        }
      } catch { }
    }

    const resultado = await CitaService.obtenerCitasPaginadas({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      fecha: rangoFechas,
      filtroGeneral,
      rol: req.rol,
      usuarioId: req.uid
    });

    return res.json(resultado);
  } catch (error) {
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
    
    HistorialService.registrarAccion({
      usuario: req.uid,
      accion: 'ACTUALIZAR',
      modulo: 'CITAS',
      descripcion: `Actualizó los detalles de la cita`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

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

    const citaActualizada = await CitaService.actualizarCita(id, {
      fecha,
      observaciones: observacion
    });

    if (!citaActualizada) return res.status(404).json({ message: 'Cita no encontrada' });
    res.json(citaActualizada);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor' });
  }
};

const iniciarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { hora } = req.body;

    const cita = await CitaService.iniciarCita(id, hora);

    return res.json({
      success: true,
      mensaje: 'Cita iniciada correctamente',
      data: cita
    });
  } catch (error) {
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

    if (!id) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de la cita es requerido'
      });
    }

    if (!hora || typeof hora !== 'string' || hora.trim() === '') {
      hora = undefined;
    } else {
      hora = hora.trim();
    }

    const cita = await CitaService.finalizarCita(id, hora);

    return res.json({
      success: true,
      mensaje: 'Cita finalizada correctamente',
      data: cita
    });
  } catch (error) {
    console.error("ERROR FINALIZAR:", error);
    return res.status(error.status || 500).json({
      success: false,
      mensaje: error.message || 'Error al finalizar la cita'
    });
  }
};

// Cancelar cita
const cancelarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const cita = await CitaService.cancelarCita(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    
    HistorialService.registrarAccion({
      usuario: req.uid,
      accion: 'ELIMINAR',
      modulo: 'CITAS',
      descripcion: `Canceló la cita`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.json({ mensaje: 'Cita cancelada exitosamente', cita });
  } catch (error) {
    return res.status(error.status || 500).json({ mensaje: error.message || 'Error al cancelar la cita' });
  }
};

// Obtener citas por sede y fecha
const getCitasPorSedeYFecha = async (req, res) => {
  try {
    const { sedeId, fecha } = req.query;
    if (!sedeId || !fecha) return res.status(400).json({ mensaje: "Falta sedeId o fecha" });

    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return res.status(400).json({ mensaje: "Fecha inválida" });

    const inicioDia = new Date(fechaObj); inicioDia.setUTCHours(0, 0, 0, 0);
    const finDia = new Date(fechaObj); finDia.setUTCHours(23, 59, 59, 999);

    const citas = await Cita.find({ sede: sedeId, fecha: { $gte: inicioDia, $lte: finDia } })
      .populate("cliente", "nombre")
      .populate("peluquero", "nombre")
      .populate("servicios", "nombre duracion");

    return res.json({ data: citas });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error al obtener citas", error: error.message });
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

    // Validaciones básicas usando constantes
    if (!monto || isNaN(monto) || monto <= 0) {
      return res.status(400).json({ mensaje: Mensajes.ERROR_MONTO_INVALIDO || 'Monto inválido' });
    }

    if (!metodo || !Object.values(MetodosPago).includes(metodo)) {
      return res.status(400).json({ mensaje: Mensajes.ERROR_METODO_INVALIDO || 'Método de pago no válido' });
    }

    const cita = await pagarCitaService(id, monto, metodo);

    return res.json({
      mensaje: Mensajes.EXITO_PAGO_REGISTRADO || 'Pago registrado correctamente',
      cita
    });

  } catch (error) {
    console.error('❌ Error en pagarCita controller:', error);

    return res.status(error.status || 500).json({
      mensaje: error.message || 'Error al pagar la cita',
      stack: error.stack
    });
  }
};

// Reportar pago (cliente)
const reportarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { metodo, observaciones } = req.body;
    let urlComprobante = null;

    if (req.file) {
      urlComprobante = req.file.location;
      if (!urlComprobante) {
        const { BUCKET_NAME } = require('../config/minio');
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT && process.env.MINIO_PORT !== '443' && process.env.MINIO_PORT !== '80' ? `:${process.env.MINIO_PORT}` : '';
        const minioPublicUrl = process.env.MINIO_PUBLIC_URL || `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${endpoint}${port}`;
        urlComprobante = `${minioPublicUrl}/${BUCKET_NAME}/${req.file.key}`;
      }
    }

    if (!metodo || !Object.values(MetodosPago).includes(metodo)) {
      return res.status(400).json({ mensaje: Mensajes.ERROR_METODO_INVALIDO || 'Método de pago no válido' });
    }

    const cita = await CitaService.reportarPago(id, metodo, observaciones, urlComprobante);

    // Notificar al barbero
    try {
      const nombreCliente = cita.cliente?.usuario?.nombre || 'Un cliente';
      const fechaCita = cita.fechaInicio || cita.fecha;
      const payload = {
        nombreCliente,
        fecha: new Date(fechaCita).toLocaleDateString('es-CO'),
        hora: new Date(fechaCita).toLocaleTimeString('es-CO'),
        peluqueroId: cita.peluquero?._id || cita.peluquero,
        metodo,
        observaciones,
        urlComprobante
      };
      NotificationService.notify('PAGO_REPORTADO', payload).catch(e => console.log('Error notificando PAGO_REPORTADO:', e.message));
    } catch (notifyErr) {
      console.log('Error preparando notificacion PAGO_REPORTADO:', notifyErr.message);
    }

    return res.json({
      mensaje: 'Pago reportado correctamente, en espera de confirmación',
      cita
    });

  } catch (error) {
    console.error('❌ Error en reportarPago controller:', error);
    return res.status(error.status || 500).json({
      mensaje: error.message || 'Error al reportar el pago',
      stack: error.stack
    });
  }
};

// ===================== Calificar Cita =====================
const calificarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { calificacion, comentario_calificacion } = req.body;

    const citaActualizada = await CitaService.calificarCita(id, calificacion, comentario_calificacion);

    return res.json({
      mensaje: '¡Gracias por tu calificación!',
      cita: citaActualizada
    });
  } catch (error) {
    console.error('Error en calificarCita controller:', error);
    return res.status(error.status || 500).json({
      mensaje: error.message || 'Error al calificar la cita'
    });
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
  reportarPago,
  calificarCita
};
