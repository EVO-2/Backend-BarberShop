const { Schema, model } = require('mongoose');
const { MetodosPago, EstadosPago } = require('../constants');

const PagoSchema = new Schema({
  cita: {
    type: Schema.Types.ObjectId,
    ref: 'Cita',
    required: true,
    unique: true
  },
  monto: {
    type: Number,
    required: true
  },
  metodo: {
    type: String,
    enum: Object.values(MetodosPago),
    required: true
  },
  estado: {
    type: String,
    enum: Object.values(EstadosPago),
    default: EstadosPago.PENDIENTE
  },
  observaciones: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = model('Pago', PagoSchema);
