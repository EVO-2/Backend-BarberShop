const { Schema, model, models } = require('mongoose');

const ProveedorSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
    nombre: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 100
    },
    telefono: {
        type: String,
        trim: true,
        match: [/^[0-9+ ]+$/, 'Teléfono inválido']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Email inválido']
    },
    direccion: {
        type: String,
        trim: true
    },
    estado: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// 🔎 Índice para búsquedas rápidas
ProveedorSchema.index({ nombre: 1 });

module.exports = models.Proveedor || model('Proveedor', ProveedorSchema);