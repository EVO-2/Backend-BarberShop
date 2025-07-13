const { Schema, model } = require('mongoose');

const InventarioSchema = new Schema({
  nombre: {
    type: String,
    required: true
  },
  descripcion: {
    type: String
  },
  tipo: {
    type: String,
    enum: ['producto', 'herramienta', 'insumo'],
    required: true
  },
  cantidad: {
    type: Number,
    required: true,
    default: 0
  },
  sede: {
    type: Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('Inventario', InventarioSchema);
