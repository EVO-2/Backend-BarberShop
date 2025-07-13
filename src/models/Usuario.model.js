const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new Schema({
  nombre:   { type: String, required: true },
  correo:   { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  rol:      { type: Schema.Types.ObjectId, ref: 'Rol', required: true }, // referencia a Rol
  foto:     { type: String, default: '' },
  estado:   { type: Boolean, default: true }
}, {
  timestamps: true
});

// 🔐 Middleware para hashear contraseña automáticamente
UsuarioSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

module.exports = model('Usuario', UsuarioSchema);
