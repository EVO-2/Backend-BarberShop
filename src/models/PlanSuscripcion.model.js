const { Schema, model, models } = require('mongoose');

const PlanSuscripcionSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  precioMensual: {
    type: Number,
    required: true,
    default: 0
  },
  moneda: {
    type: String,
    default: 'COP',
    uppercase: true,
    trim: true
  },
  caracteristicas: {
    maxPeluqueros: { type: Number, default: 3 }, // Ej: 3. Usa un número grande (999) para ilimitados
    maxSucursales: { type: Number, default: 1 },
    incluyeBotWhatsApp: { type: Boolean, default: false }
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = models.PlanSuscripcion || model('PlanSuscripcion', PlanSuscripcionSchema);
