const { Schema, model } = require('mongoose');

const CitaSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  peluquero: { type: Schema.Types.ObjectId, ref: 'Peluquero', required: true },
  servicios: [{
    type: Schema.Types.ObjectId,
    ref: 'Servicio',
    required: true,
    validate: {
      validator: v => Array.isArray(v) && v.length > 0,
      message: 'Debe seleccionar al menos un servicio'
    }
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

  observaciones: { type: String, maxlength: 500 }
}, {
  timestamps: true
});

// Evitar doble asignación del mismo peluquero en el mismo turno y día
CitaSchema.index(
  { peluquero: 1, fechaBase: 1, turno: 1 },
  { unique: true }
);

// Evitar duplicados en puesto de trabajo
CitaSchema.index(
  { puestoTrabajo: 1, fechaBase: 1, turno: 1 },
  { unique: true }
);

// Para búsquedas rápidas por sede y fecha
CitaSchema.index({ sede: 1, fechaBase: 1 });

// Middleware para establecer fechaBase automáticamente
CitaSchema.pre('validate', function(next) {
  if (this.fecha) {
    const base = new Date(this.fecha);
    base.setHours(0, 0, 0, 0);
    this.fechaBase = base;
  }
  next();
});

module.exports = model('Cita', CitaSchema);
