const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  nombre: {
    type: String,
    required: true,
    match: [/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/, 'El nombre solo debe contener letras y espacios']
  },
  correo: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  rol: {
    type: Schema.Types.ObjectId,
    ref: 'Rol',
    required: true
  },
  foto: {
    type: String,
    default: ''
  },
  estado: {
    type: Boolean,
    default: true
  },

  // Relaciones uno a uno con Cliente y Peluquero
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    default: null
  },
  peluquero: {
    type: Schema.Types.ObjectId,
    ref: 'Peluquero',
    default: null
  },

  // Suscripciones Web Push (Service Worker)
  suscripcionesPush: [{
    endpoint: String,
    expirationTime: Date,
    keys: {
      p256dh: String,
      auth: String
    }
  }]

}, {
  timestamps: true,
  versionKey: false
});

// 🔐 Middleware para hashear contraseña automáticamente
UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    return next(error);
  }
});

// ✅ Método para encriptar una contraseña manualmente
UsuarioSchema.methods.encriptarPassword = async function (passwordPlano) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(passwordPlano, salt);
};

// ✅ Método para comparar contraseñas
UsuarioSchema.methods.compararPassword = async function (passwordPlano) {
  return await bcrypt.compare(passwordPlano, this.password);
};

module.exports = model('Usuario', UsuarioSchema);
