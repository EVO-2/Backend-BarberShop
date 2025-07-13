// src/models/Servicio.model.js
const { Schema, model } = require('mongoose');

const ServicioSchema = new Schema({
  nombre: { type: String, required: true },
  precio: { type: Number, required: true },
  duracion: { type: Number, required: true }, // en minutos
  estado: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = model('Servicio', ServicioSchema);
