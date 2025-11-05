const { Schema, model } = require('mongoose');

const ReporteSchema = new Schema({
  titulo: {
    type: String,
    required: true
  },
  descripcion: {
    type: String
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaFin: {
    type: Date,
    required: true
  },
  tipo: {
    type: String,
    enum: ['financiero', 'operativo', 'servicios', 'personalizado'],
    default: 'personalizado'
  },
  generadoPor: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  datos: {
    type: Schema.Types.Mixed, // puede almacenar JSON arbitrario (resumenes, tablas, etc.)
    default: {}
  },
  estado: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = model('Reporte', ReporteSchema);
