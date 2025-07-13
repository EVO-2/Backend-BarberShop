const { Schema, model } = require('mongoose');

const PagoSchema = new Schema({
  cita: {
    type: Schema.Types.ObjectId,
    ref: 'Cita',
    required: true,
    unique: true // Un pago por cita
  },
  monto: {
    type: Number,
    required: true
  },
  metodo: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'transferencia'],
    required: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado', 'fallido'],
    default: 'pendiente'
  },
  observaciones: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = model('Pago', PagoSchema);
