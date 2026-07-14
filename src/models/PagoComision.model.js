const { Schema, model } = require('mongoose');

const PagoComisionSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  peluquero: {
    type: Schema.Types.ObjectId,
    ref: 'Peluquero',
    required: true
  },
  administrador: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  montoTotal: {
    type: Number,
    required: true,
    min: [0, 'El monto no puede ser negativo']
  },
  cantidadCitas: {
    type: Number,
    required: true,
    min: [1, 'Debe haber al menos 1 cita para pagar comisión']
  },
  citasPagadas: [{
    type: Schema.Types.ObjectId,
    ref: 'Cita'
  }],
  metodoPago: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta', 'otro'],
    default: 'efectivo'
  },
  observaciones: {
    type: String,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = model('PagoComision', PagoComisionSchema);
