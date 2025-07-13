const { Schema, model } = require('mongoose');

const PeluqueroSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true  // Relación uno a uno
  },
  especialidades: {
    type: [String], // Ej: ["fade", "tinte"]
    default: []
  },
  experiencia: {
    type: Number, // Años de experiencia
    default: 0
  },
  sede: {
    type: Schema.Types.ObjectId,
    ref: 'Sede'
  },
  puestoTrabajo: {
    type: Schema.Types.ObjectId,
    ref: 'PuestoTrabajo'
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('Peluquero', PeluqueroSchema);
