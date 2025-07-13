const { Schema, model } = require('mongoose');

const SedeSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true
  },
  direccion: {
    type: String,
    required: true
  },
  telefono: {
    type: String
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('Sede', SedeSchema);
