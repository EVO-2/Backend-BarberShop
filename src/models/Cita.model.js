const { Schema, model } = require('mongoose');

const CitaSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  peluquero: { type: Schema.Types.ObjectId, ref: 'Peluquero', required: true },
  servicios: [{ type: Schema.Types.ObjectId, ref: 'Servicio', required: true }],
  sede: { type: Schema.Types.ObjectId, ref: 'Sede', required: true },
  puestoTrabajo: { type: Schema.Types.ObjectId, ref: 'PuestoTrabajo', required: true },
  pago: { type: Schema.Types.ObjectId, ref: 'Pago', default: null },

  fecha: { type: Date, required: true },
  turno: { type: Number, required: true },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'completada', 'finalizada'],
    default: 'pendiente'
  },

  observaciones: { type: String, maxlength: 500 }
}, {
  timestamps: true
});

// Índice único para evitar doble asignación al mismo peluquero en el mismo turno y día
CitaSchema.index(
  { peluquero: 1, fecha: 1, turno: 1 },
  { unique: true }
);

// (Opcional) Otro índice si deseas evitar duplicados en el puestoTrabajo
CitaSchema.index(
  { puestoTrabajo: 1, fecha: 1, turno: 1 },
  { unique: true }
);

module.exports = model('Cita', CitaSchema);
