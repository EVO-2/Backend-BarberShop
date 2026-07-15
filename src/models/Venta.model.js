const { Schema, model } = require('mongoose');
const { EstadosPago } = require('../constants');

const VentaSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
  sede: {
    type: Schema.Types.ObjectId,
    ref: 'Sede',
    required: true
  },
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true // El usuario/admin que registró la venta
  },
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    default: null // Opcional, puede ser una venta al público en general sin cliente registrado
  },
  productos: [{
    producto: {
      type: Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    required: true
  },
  estado: {
    type: String,
    enum: Object.values(EstadosPago) || ['pendiente', 'pagado', 'cancelado', 'rechazado'],
    default: 'pagado'
  },
  observaciones: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = model('Venta', VentaSchema);
