const { Schema, model } = require('mongoose');

const CitaSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  peluquero: { type: Schema.Types.ObjectId, ref: 'Peluquero', required: true },

  servicios: [{
    type: Schema.Types.ObjectId,
    ref: 'Servicio',
    required: true
  }],

  sede: { type: Schema.Types.ObjectId, ref: 'Sede', required: true },
  puestoTrabajo: { type: Schema.Types.ObjectId, ref: 'PuestoTrabajo', required: true },
  pago: { type: Schema.Types.ObjectId, ref: 'Pago', default: null },

  fecha: { type: Date, required: true },        // Fecha y hora exacta de la cita
  fechaBase: { type: Date, required: true },    // Solo la fecha (sin hora) para índices
  turno: { type: Number, required: true },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'completada', 'finalizada', 'cancelada'],
    default: 'pendiente'
  },

  observacion: { type: String, maxlength: 500 }
}, {
  timestamps: true
});

/**
 * Índices para garantizar consistencia:
 * - Un peluquero no puede tener 2 citas en el mismo turno y día
 * - Un puesto de trabajo no puede tener 2 citas en el mismo turno y día
 */
CitaSchema.index(
  { peluquero: 1, fechaBase: 1, turno: 1 },
  { unique: true }
);

CitaSchema.index(
  { puestoTrabajo: 1, fechaBase: 1, turno: 1 },
  { unique: true }
);

// Para búsquedas rápidas por sede y fecha
CitaSchema.index({ sede: 1, fechaBase: 1 });

// Middleware: establece fechaBase a partir de fecha
CitaSchema.pre('validate', function (next) {
  if (this.fecha) {
    const base = new Date(this.fecha);
    base.setHours(0, 0, 0, 0);
    this.fechaBase = base;
  }
  next();
});

// Validación: asegurarse de que haya al menos 1 servicio
CitaSchema.path('servicios').validate(function (value) {
  return Array.isArray(value) && value.length > 0;
}, 'Debe seleccionar al menos un servicio');

module.exports = model('Cita', CitaSchema);
