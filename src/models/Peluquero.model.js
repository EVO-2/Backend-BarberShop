const { Schema, model } = require('mongoose');

const PeluqueroSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true 
  },
  especialidades: {
    type: [String], 
    default: []
  },
  experiencia: {
    type: Number, 
    default: 0,
    min: [0, 'La experiencia no puede ser negativa']
  },
  telefono_profesional: {
    type: String,
    match: [/^\d{10}$/, 'El número debe tener exactamente 10 dígitos'],
    default: ''
  },
  direccion_profesional: { 
    type: String,
    default: ''
  },
  genero: {
    type: String,
    enum: ['masculino', 'femenino', 'otro'],
    default: 'otro'
  },
  fecha_nacimiento: {
    type: Date
  },
  sede: {
    type: Schema.Types.ObjectId,
    ref: 'Sede',
    default: null
  },
  puestoTrabajo: {
    type: Schema.Types.ObjectId,
    ref: 'PuestoTrabajo',
    default: null
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('Peluquero', PeluqueroSchema);
