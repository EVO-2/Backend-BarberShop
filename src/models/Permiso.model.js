const mongoose = require('mongoose');

const PermisoSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        modulo: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        clave: {
            type: String,
            required: true,
            unique: true
        },
        tipo: {
            type: String,
            enum: ['crear', 'leer', 'editar', 'eliminar'],
            required: true
        },
        descripcion: {
            type: String,
            default: ''
        }
    },
    { timestamps: true, versionKey: false }
);

PermisoSchema.index({ nombre: 1, modulo: 1 }, { unique: true });

module.exports = mongoose.models.Permiso || mongoose.model('Permiso', PermisoSchema);