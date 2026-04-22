const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  sede: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  tipo: {
    type: String,
    enum: ['entrada', 'salida'],
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1
  },
  motivo: {
    type: String,
    default: ''
  },
  referencia: {
    type: String
  }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Movimiento', movimientoSchema);