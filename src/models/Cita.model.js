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
  turno: { type: Number, required: true },      // Turno incremental por peluquero

  // ⏱️ Nuevos campos para controlar tiempos reales
  inicioServicio: { type: Date, default: null },
  finServicio: { type: Date, default: null },
  duracionRealMin: { type: Number, default: null },

  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'en_proceso', 'finalizada', 'cancelada'],
    default: 'pendiente'
  },

  observacion: { type: String, maxlength: 500 }
}, {
  timestamps: true
});

/**
 * Índice único:
 * - Asegura que un mismo peluquero no tenga dos turnos con el mismo número el mismo día.
 */
CitaSchema.index(
  { peluquero: 1, fechaBase: 1, turno: 1 },
  { unique: true }
);

// ⚠️ Eliminamos el índice de puestoTrabajo, porque la validación de solapamiento
// ya se maneja en el service.js con existeSolape()
// Esto permite varias citas en el mismo puesto en un día, siempre que no coincidan en horario.

// Para búsquedas rápidas por sede y fecha
CitaSchema.index({ sede: 1, fechaBase: 1 });

/**
 * Middleware:
 * - Calcula fechaBase a partir de fecha
 * - Asigna turno incremental por peluquero y día
 */
CitaSchema.pre('validate', async function (next) {
  if (this.fecha) {
    // fecha base (día sin hora)
    const base = new Date(this.fecha);
    base.setHours(0, 0, 0, 0);
    this.fechaBase = base;
  }

  // Solo calcular turno si es nueva cita o cambió peluquero/fecha
  if (this.isNew || this.isModified('fecha') || this.isModified('peluquero')) {
    try {
      const count = await model('Cita').countDocuments({
        peluquero: this.peluquero,
        fechaBase: this.fechaBase
      });
      this.turno = count + 1; // Turno incremental independiente por peluquero y día
    } catch (err) {
      return next(err);
    }
  }

  next();
});

// Validación: asegurarse de que haya al menos 1 servicio
CitaSchema.path('servicios').validate(function (value) {
  return Array.isArray(value) && value.length > 0;
}, 'Debe seleccionar al menos un servicio');

module.exports = model('Cita', CitaSchema);
