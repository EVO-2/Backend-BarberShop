const { Schema, model, models } = require('mongoose');

const WhatsAppSessionSchema = new Schema({
  telefono: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    required: true
  },
  pasoActual: {
    type: String,
    enum: [
      'INICIO',
      'SELECT_SEDE',
      'SELECT_SERVICIO',
      'SELECT_PELUQUERO',
      'SELECT_FECHA',
      'SELECT_HORA',
      'CONFIRMACION'
    ],
    default: 'INICIO'
  },
  datosCita: {
    type: Schema.Types.Mixed,
    default: {}
  },
  expiration: {
    type: Date,
    default: () => new Date(Date.now() + 3600 * 1000), // Expiración por defecto en 1 hora
    index: { expires: 0 } // TTL Index de MongoDB
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = models.WhatsAppSession || model('WhatsAppSession', WhatsAppSessionSchema);
