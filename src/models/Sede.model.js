const { Schema, model, models } = require('mongoose');

const SedeSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  direccion: {
    type: String,
    required: true,
    trim: true
  },
  telefono: {
    type: String,
    trim: true,
    match: [/^[0-9+ ]+$/, 'Teléfono inválido']
  },
  ciudad: {
    type: String,
    trim: true
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
SedeSchema.index({ nombre: 1 });

// ✅ Evita OverwriteModelError
module.exports = models.Sede || model('Sede', SedeSchema);