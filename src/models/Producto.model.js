const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    required: true
  },
  proveedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor',
    required: true
  },
  sede: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  tipo: {
    type: String,
    enum: ['venta', 'uso_interno'],
    default: 'venta'
  },
  cantidad: {
    type: Number,
    default: 0,
    min: 0
  },
  precio: {
    type: Number,
    default: 0,
    min: 0
  },
  usado: {
    type: Boolean,
    default: false
  },
  imagen: {
    type: String,
    trim: true,
    match: /^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i,
    default: null
  },
  estado: {
    type: Boolean,
    default: true
  }
}, { timestamps: true, versionKey: false });

productoSchema.index({ nombre: 'text' });

module.exports = mongoose.models.Producto || mongoose.model('Producto', productoSchema);