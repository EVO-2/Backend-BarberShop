const mongoose = require('mongoose');

const RolSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    descripcion: {
      type: String,
      default: ''
    },
    permisos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permiso'
      }
    ],
    estado: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.models.Rol || mongoose.model('Rol', RolSchema);