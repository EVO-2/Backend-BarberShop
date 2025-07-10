const { Schema, model } = require('mongoose');

const UsuarioSchema = new Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, required: true },
  estado: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = model('Usuario', UsuarioSchema);
