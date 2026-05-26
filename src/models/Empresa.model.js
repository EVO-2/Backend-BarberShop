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
  logo: {
    type: String,
    default: 'assets/sede.png'
  },
  agendamientoAbierto: {
    type: Boolean,
    default: true
  },
  mensajeCierre: {
    type: String,
    default: 'El agendamiento de citas se encuentra temporalmente cerrado.'
  },
  horarios: {
    type: [{
      dia: { type: String, enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] },
      abierto: { type: Boolean, default: true },
      apertura: { type: String, default: '08:00' },
      cierre: { type: String, default: '20:00' }
    }],
    default: [
      { dia: 'lunes', abierto: true, apertura: '08:00', cierre: '20:00' },
      { dia: 'martes', abierto: true, apertura: '08:00', cierre: '20:00' },
      { dia: 'miercoles', abierto: true, apertura: '08:00', cierre: '20:00' },
      { dia: 'jueves', abierto: true, apertura: '08:00', cierre: '20:00' },
      { dia: 'viernes', abierto: true, apertura: '08:00', cierre: '20:00' },
      { dia: 'sabado', abierto: true, apertura: '09:00', cierre: '18:00' },
      { dia: 'domingo', abierto: false, apertura: '09:00', cierre: '14:00' }
    ]
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
