const Cita = require('../models/Cita.model');
const PagoComision = require('../models/PagoComision.model');
const Peluquero = require('../models/Peluquero.model');
const HistorialService = require('../services/historial.service');

// Obtener comisiones pendientes agrupadas por peluquero (Admin)
const getComisionesPendientes = async (req, res) => {
  try {
    const { empresaId } = req.usuario;

    // Buscar citas en estado "pagada" (o "finalizada" que ya fue pagada) 
    // pero para seguridad, la comisión se da cuando está "pagada" o si se maneja desde finalizada.
    // Asumiremos estado "pagada" o que haya generado comision.
    const citasPendientes = await Cita.find({
      empresaId,
      estado: 'pagada',
      comisionPagadaAlPeluquero: false,
      comisionPeluquero: { $gt: 0 }
    }).populate({
      path: 'peluquero',
      populate: { path: 'usuario', select: 'nombre correo foto' }
    });

    // Agrupar por peluquero
    const agrupado = citasPendientes.reduce((acc, cita) => {
      const pId = cita.peluquero._id.toString();
      if (!acc[pId]) {
        acc[pId] = {
          peluquero: cita.peluquero,
          montoAcumulado: 0,
          citas: []
        };
      }
      acc[pId].montoAcumulado += cita.comisionPeluquero;
      acc[pId].citas.push(cita);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: Object.values(agrupado)
    });
  } catch (error) {
    console.error('Error en getComisionesPendientes:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al obtener comisiones pendientes' });
  }
};

// Pagar comisiones a un peluquero (Admin)
const pagarComisiones = async (req, res) => {
  try {
    const { empresaId, uid } = req;
    const { peluqueroId, metodoPago, observaciones } = req.body;

    if (!peluqueroId) {
      return res.status(400).json({ success: false, mensaje: 'ID del peluquero es requerido' });
    }

    const citasPendientes = await Cita.find({
      empresaId,
      peluquero: peluqueroId,
      estado: 'pagada',
      comisionPagadaAlPeluquero: false,
      comisionPeluquero: { $gt: 0 }
    });

    if (citasPendientes.length === 0) {
      return res.status(400).json({ success: false, mensaje: 'No hay comisiones pendientes para este profesional' });
    }

    const montoTotal = citasPendientes.reduce((sum, cita) => sum + cita.comisionPeluquero, 0);
    const idsCitas = citasPendientes.map(c => c._id);

    // Crear el registro de Pago de Comisión
    const nuevoPago = new PagoComision({
      empresaId,
      peluquero: peluqueroId,
      administrador: uid,
      montoTotal,
      cantidadCitas: citasPendientes.length,
      citasPagadas: idsCitas,
      metodoPago: metodoPago || 'efectivo',
      observaciones
    });

    await nuevoPago.save();

    // Actualizar las citas
    await Cita.updateMany(
      { _id: { $in: idsCitas } },
      { 
        $set: { 
          comisionPagadaAlPeluquero: true,
          pagoComision: nuevoPago._id
        } 
      }
    );

    // Registrar en historial
    const peluquero = await Peluquero.findById(peluqueroId).populate('usuario', 'nombre');
    HistorialService.registrarAccion({
      usuario: uid,
      accion: 'CREAR',
      modulo: 'COMISIONES',
      descripcion: `Pagó $${montoTotal} de comisiones a ${peluquero?.usuario?.nombre || 'Profesional'}`,
      entidadId: nuevoPago._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.json({
      success: true,
      mensaje: 'Comisiones pagadas correctamente',
      data: nuevoPago
    });

  } catch (error) {
    console.error('Error en pagarComisiones:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al pagar comisiones' });
  }
};

// Obtener mi comisión (Profesional)
const getMiComision = async (req, res) => {
  try {
    const { empresaId, uid } = req;
    
    // Obtener el peluquero asociado al usuario actual
    const peluquero = await Peluquero.findOne({ usuario: uid });
    if (!peluquero) {
      return res.status(403).json({ success: false, mensaje: 'No eres un profesional registrado' });
    }

    const citasPendientes = await Cita.find({
      empresaId,
      peluquero: peluquero._id,
      estado: 'pagada',
      comisionPagadaAlPeluquero: false,
      comisionPeluquero: { $gt: 0 }
    }).select('fecha comisionPeluquero porcentajeComisionAplicado servicios total');

    const montoTotal = citasPendientes.reduce((sum, cita) => sum + cita.comisionPeluquero, 0);

    return res.json({
      success: true,
      data: {
        montoAcumulado: montoTotal,
        citas: citasPendientes
      }
    });

  } catch (error) {
    console.error('Error en getMiComision:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al obtener tu comisión' });
  }
};

// Historial de comisiones pagadas (Admin)
const getHistorialPagos = async (req, res) => {
  try {
    const { empresaId } = req.usuario;
    const historial = await PagoComision.find({ empresaId })
      .populate({
        path: 'peluquero',
        populate: { path: 'usuario', select: 'nombre foto' }
      })
      .populate('administrador', 'nombre')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: historial });
  } catch (error) {
    console.error('Error en getHistorialPagos:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al obtener el historial de pagos' });
  }
};

// Historial de mis comisiones pagadas (Profesional)
const getMiHistorialPagos = async (req, res) => {
  try {
    const { empresaId, uid } = req;
    const peluquero = await Peluquero.findOne({ usuario: uid });
    if (!peluquero) {
      return res.status(403).json({ success: false, mensaje: 'No eres un profesional registrado' });
    }

    const historial = await PagoComision.find({ empresaId, peluquero: peluquero._id })
      .populate('administrador', 'nombre')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: historial });
  } catch (error) {
    console.error('Error en getMiHistorialPagos:', error);
    return res.status(500).json({ success: false, mensaje: 'Error al obtener tu historial de pagos' });
  }
}


module.exports = {
  getComisionesPendientes,
  pagarComisiones,
  getMiComision,
  getHistorialPagos,
  getMiHistorialPagos
};
