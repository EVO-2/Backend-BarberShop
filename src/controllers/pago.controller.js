// controllers/pago.controller.js
const Pago = require('../models/Pago.model');
const Cita = require('../models/Cita.model');

/* =========================
   Controladores de Pago
   ========================= */

// Crear un pago para una cita
const crearPago = async (req, res) => {
  try {
    const { cita: citaId, monto, metodo, observaciones } = req.body;

    if (!citaId || !monto || !metodo) {
      return res.status(400).json({ mensaje: 'cita, monto y metodo son obligatorios' });
    }

    // Verificar que la cita exista y no tenga pago
    const cita = await Cita.findById(citaId).populate('pago');
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    if (cita.pago) return res.status(400).json({ mensaje: 'La cita ya tiene un pago registrado' });

    // Crear pago
    const pago = await Pago.create({ cita: citaId, monto, metodo, observaciones });

    // Asociar pago a la cita
    cita.pago = pago._id;
    await cita.save();

    return res.status(201).json({ mensaje: 'Pago registrado correctamente', pago });
  } catch (error) {
    console.error('❌ Error al crearPago:', error);
    return res.status(500).json({ mensaje: 'Error al registrar el pago' });
  }
};

// Obtener todos los pagos
const obtenerPagos = async (_req, res) => {
  try {
    const pagos = await Pago.find().populate({
      path: 'cita',
      populate: [
        { path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } },
        { path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } }
      ]
    });
    res.json(pagos);
  } catch (error) {
    console.error('❌ Error al obtenerPagos:', error);
    res.status(500).json({ mensaje: 'Error al obtener los pagos' });
  }
};

// Obtener un pago por ID
const obtenerPagoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const pago = await Pago.findById(id).populate({
      path: 'cita',
      populate: [
        { path: 'cliente', populate: { path: 'usuario', select: 'nombre correo' } },
        { path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } }
      ]
    });
    if (!pago) return res.status(404).json({ mensaje: 'Pago no encontrado' });
    res.json(pago);
  } catch (error) {
    console.error('❌ Error al obtenerPagoPorId:', error);
    res.status(500).json({ mensaje: 'Error al obtener el pago' });
  }
};

// Actualizar un pago (por ejemplo, cambiar estado a 'pagado')
const actualizarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, metodo, estado, observaciones } = req.body;

    const pago = await Pago.findById(id);
    if (!pago) return res.status(404).json({ mensaje: 'Pago no encontrado' });

    if (monto !== undefined) pago.monto = monto;
    if (metodo) pago.metodo = metodo;
    if (estado) pago.estado = estado;
    if (observaciones) pago.observaciones = observaciones;

    await pago.save();
    res.json({ mensaje: 'Pago actualizado correctamente', pago });
  } catch (error) {
    console.error('❌ Error al actualizarPago:', error);
    res.status(500).json({ mensaje: 'Error al actualizar el pago' });
  }
};

module.exports = {
  crearPago,
  obtenerPagos,
  obtenerPagoPorId,
  actualizarPago
};
