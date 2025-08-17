const { Schema, model, models } = require('mongoose');

const SedeSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true 
  },
  direccion: {
    type: String,
    required: true,
    trim: true
  },
  telefono: {
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

// ✅ Corrección para evitar OverwriteModelError
module.exports = models.Sede || model('Sede', SedeSchema);
