const { Schema, model } = require('mongoose');

const CitaSchema = new Schema({
  cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
  peluquero: { type: Schema.Types.ObjectId, ref: 'Peluquero', required: true },
  servicios: [{ type: Schema.Types.ObjectId, ref: 'Servicio', required: true }],
  fecha: { type: Date, required: true },
  turno: { type: Number, required: true },
  estado: {
    type: String,
    enum: ['pendiente', 'confirmada', 'completada', 'cancelada'],
    default: 'pendiente'
  },
  observaciones: { type: String }
}, {
  timestamps: true
});

// 👇 Agrega el índice compuesto aquí:
CitaSchema.index(
  { peluquero: 1, fecha: 1, turno: 1 },
  { unique: true }
);

module.exports = model('Cita', CitaSchema);
