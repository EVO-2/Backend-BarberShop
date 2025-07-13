const mongoose = require('mongoose');

const RolSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      enum: ['admin', 'cliente', 'barbero', 'recepcionista', 'gerente']
    },
    descripcion: {
      type: String
    },
    estado: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rol', RolSchema);
