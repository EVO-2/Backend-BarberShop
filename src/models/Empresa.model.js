const { Schema, model, models } = require('mongoose');

const EmpresaSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nit: {
    type: String,
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// 🔎 Índice para búsquedas
EmpresaSchema.index({ nombre: 1 });

// ✅ Evita OverwriteModelError
module.exports = models.Empresa || model('Empresa', EmpresaSchema);
