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
    required: function () {
      return this.estado === 'pagado';
    },
    default: null
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
