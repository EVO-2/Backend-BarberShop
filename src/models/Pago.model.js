const { Schema, model } = require('mongoose');
const { MetodosPago, EstadosPago } = require('../constants');

const PagoSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
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
  },
  urlComprobante: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = model('Pago', PagoSchema);
