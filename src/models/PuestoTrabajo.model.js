const mongoose = require('mongoose');

const PuestoTrabajoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  sede: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  peluquero: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Peluquero',
    default: null
  },
  estado: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// ✅ Corrección para evitar OverwriteModelError:
module.exports = mongoose.models.PuestoTrabajo || mongoose.model('PuestoTrabajo', PuestoTrabajoSchema);
