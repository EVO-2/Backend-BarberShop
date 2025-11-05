const { Schema, model } = require('mongoose');

const HistorialAccesoSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String
  },
  dispositivo: {
    type: String // Ejemplo: "Windows 10 - Chrome", "Android - Firefox"
  },
  exito: {
    type: Boolean,
    default: true // false si fue intento fallido
  }
}, {
  timestamps: true
});

module.exports = model('HistorialAcceso', HistorialAccesoSchema);
