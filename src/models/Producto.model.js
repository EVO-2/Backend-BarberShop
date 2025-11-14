const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  categoria: { type: String },
  cantidad: { type: Number, default: 0 },
  precio: { type: Number, default: 0 },
  usado: { type: Boolean, default: false },
  fechaRegistro: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Producto', productoSchema);
