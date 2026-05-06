const { Schema, model, models } = require('mongoose');

const EmpresaSchema = new Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  nit: {
    type: String,
    trim: true
  },
  direccion: {
    type: String,
    trim: true
  },
  telefono: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  estado: {
    type: Boolean,
    default: true
  },
  // ==========================================
  // 🏢 SaaS & Facturación (Suscripciones)
  // ==========================================
  plan: {
    type: String,
    enum: ['trial', 'basico', 'pro', 'premium'],
    default: 'trial'
  },
  suscripcionEstado: {
    type: String,
    enum: ['trial', 'activa', 'vencida', 'suspendida', 'cancelada'],
    default: 'trial'
  },
  fechaFinPrueba: {
    type: Date,
    default: () => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 14); // 14 días de prueba gratis por defecto
      return fecha;
    }
  },
  fechaProximoCobro: {
    type: Date,
    default: null
  },
  pasarelaClienteId: {
    type: String,
    default: null // ID del cliente en Stripe / MercadoPago / Wompi
  },
  pasarelaSuscripcionId: {
    type: String,
    default: null // ID de la suscripción recurrente en la pasarela
  }
}, {
  timestamps: true,
  versionKey: false
});

// 🔎 Índice para búsquedas
EmpresaSchema.index({ nombre: 1 });

// ✅ Evita OverwriteModelError
module.exports = models.Empresa || model('Empresa', EmpresaSchema);
