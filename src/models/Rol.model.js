const mongoose = require('mongoose');

const RolSchema = new mongoose.Schema(
  {
    empresaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Empresa',
      default: null
    },
    nombre: {
      type: String,
      required: true,
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

// Índice compuesto para que el nombre del rol sea único solo dentro de cada empresa
RolSchema.index({ empresaId: 1, nombre: 1 }, { unique: true });

module.exports = mongoose.models.Rol || mongoose.model('Rol', RolSchema);