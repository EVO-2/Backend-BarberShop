const { Schema, model } = require('mongoose');

const PuestoTrabajoSchema = new Schema({
  nombre: {
    type: String,
    required: true
  },
  sede: {
    type: Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  peluquero: {
    type: Schema.Types.ObjectId,
    ref: 'Peluquero'
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('PuestoTrabajo', PuestoTrabajoSchema);
