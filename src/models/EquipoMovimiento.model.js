// models/EquipoMovimiento.model.js
const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  equipo: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipo', required: true },
  tipo: { 
    type: String, 
    enum: ['alta','traspaso','prestamo','devolucion','mantenimiento','reparacion','baja','ajuste'], 
    required: true 
  },
  fromSede: { type: mongoose.Schema.Types.ObjectId, ref: 'Sede', default: null },
  toSede: { type: mongoose.Schema.Types.ObjectId, ref: 'Sede', default: null },
  fromPuesto: { type: mongoose.Schema.Types.ObjectId, ref: 'PuestoTrabajo', default: null },
  toPuesto: { type: mongoose.Schema.Types.ObjectId, ref: 'PuestoTrabajo', default: null },
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null }, // persona que recibe o usa
  descripcion: { type: String, default: '' },
  fechaInicio: { type: Date, default: Date.now },
  fechaFin: { type: Date, default: null },
  costo: { type: Number, default: 0 }, // costo asociado a reparacion/servicio
  referenciaId: { type: mongoose.Schema.Types.ObjectId, default: null }, // ej. id de orden de servicio
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
}, { timestamps: true });

module.exports = mongoose.model('EquipoMovimiento', movimientoSchema);
