const { Schema, model } = require('mongoose');

const ClienteSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    unique: true // Uno a uno
  },
  telefono: { type: String },
  direccion: { type: String },
  genero: {
    type: String,
    enum: ['masculino', 'femenino', 'otro'],
    default: 'otro'
  },
  fecha_nacimiento: { type: Date },
  fechaAlta: { type: Date, default: Date.now },
  estado: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = model('Cliente', ClienteSchema);
