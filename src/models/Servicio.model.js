const { Schema, model } = require('mongoose');

const ServicioSchema = new Schema({
  nombre: { type: String, required: true, unique: true, trim: true },
  precio: { type: Number, required: true, min: 0 },
  duracion: { type: Number, required: true, min: 1 }, 
  estado: { type: Boolean, default: true },

  // 🔹 Campos para duración real
  inicioServicio: { type: Date },    // cuando se inicia el servicio
  finServicio: { type: Date },       // cuando se finaliza el servicio
  duracionRealMin: { type: Number }  // calculado automáticamente al finalizar
}, {
  timestamps: true
});

module.exports = model('Servicio', ServicioSchema);

