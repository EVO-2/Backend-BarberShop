const { Schema, model, models } = require('mongoose');

const PuestoTrabajoSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  sede: {
    type: Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  peluquero: {
    type: Schema.Types.ObjectId,
    ref: 'Peluquero',
    default: null
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// ✅ índice compuesto nombre+sede
PuestoTrabajoSchema.index({ nombre: 1, sede: 1 }, { unique: true });

module.exports = models.PuestoTrabajo || model('PuestoTrabajo', PuestoTrabajoSchema);
