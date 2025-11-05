const { Schema, model } = require('mongoose');

const ServicioSchema = new Schema({
  nombre: { type: String, required: true, unique: true, trim: true },
  descripcion: { type: String, trim: true }, 
  precio: { type: Number, required: true, min: 0 },
  duracion: { type: Number, required: true, min: 1 }, 
  imagenes: [{ type: String, trim: true }], 
  estado: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = model('Servicio', ServicioSchema);
