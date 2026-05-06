// models/EquipoMovimiento.model.js
const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  equipo: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipo', required: true },

  tipo: {
    type: String,
    enum: [
      'alta',
      'traspaso',
      'prestamo',
      'devolucion',
      'mantenimiento',
      'reparacion',
      'baja',
      'ajuste',
      'reactivacion'
    ],
    required: true
  },

  fromSede: { type: mongoose.Schema.Types.ObjectId, ref: 'Sede', default: null },
  toSede: { type: mongoose.Schema.Types.ObjectId, ref: 'Sede', default: null },
  fromPuesto: { type: mongoose.Schema.Types.ObjectId, ref: 'PuestoTrabajo', default: null },
  toPuesto: { type: mongoose.Schema.Types.ObjectId, ref: 'PuestoTrabajo', default: null },
  responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },

  descripcion: { type: String, default: '' },

  fechaInicio: { type: Date, default: Date.now },
  fechaFin: { type: Date, default: null },

  costo: { type: Number, default: 0 },
  referenciaId: { type: mongoose.Schema.Types.ObjectId, default: null },

  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },

}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('EquipoMovimiento', movimientoSchema);