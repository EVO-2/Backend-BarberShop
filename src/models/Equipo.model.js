// models/Equipo.model.js
const mongoose = require('mongoose');

const equipoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true, index: true },
  tipo: { type: String, required: true, trim: true },
  descripcion: { type: String, default: '' },
  serial: { type: String, default: '' },
  codigoInventario: { type: String, default: '', index: true },
  imagenes: [{ type: String }],

  sede: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sede',
    default: null
  },

  puesto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PuestoTrabajo',
    default: null
  },

  // 🔥 ELIMINADO asignadoA

  estado: {
    type: String,
    enum: ['activo', 'en_mantenimiento', 'dañado', 'fuera_de_servicio', 'retirado'],
    default: 'activo'
  },

  fechaCompra: { type: Date, default: null },

  proveedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proveedor',
    default: null
  },

  costo: { type: Number, default: 0 },
  vidaUtilMeses: { type: Number, default: 0 },
  ultimaRevision: { type: Date, default: null },
  proximoMantenimiento: { type: Date, default: null },

  activo: { type: Boolean, default: true }, // soft delete

  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },

  actualizadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null
  },

}, { timestamps: true });

// índice compuesto ejemplo (tipo + sede)
equipoSchema.index({ tipo: 1, sede: 1 });

module.exports = mongoose.model('Equipo', equipoSchema);