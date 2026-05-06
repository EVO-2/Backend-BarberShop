const mongoose = require('mongoose');

const NotificacionSchema = new mongoose.Schema({
  empresaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
    tipo: String,
    destinatario: String,
    canal: String, // email, sms, whatsapp
    estado: {
        type: String,
        enum: ['pendiente', 'enviado', 'fallido'],
        default: 'pendiente'
    },
    payload: Object,
    error: String
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('Notificacion', NotificacionSchema);