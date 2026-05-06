const { Schema, model, models } = require('mongoose');

const CategoriaSchema = new Schema({
  empresaId: {
    type: Schema.Types.ObjectId,
    ref: 'Empresa',
    default: null
  },
    nombre: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true,
        minlength: 2,
        maxlength: 100
    },
    descripcion: {
        type: String,
        trim: true,
        maxlength: 255,
        default: ''
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
CategoriaSchema.index({ nombre: 1 });

// ✅ Evita OverwriteModelError
module.exports = models.Categoria || model('Categoria', CategoriaSchema);