const mongoose = require('mongoose');

const PermisoSchema = new mongoose.Schema(
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
        modulo: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        clave: {
            type: String,
            required: true
            // quitamos el unique global de clave
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

// Índice compuesto para que los nombres y claves de permisos sean únicos solo por empresa
PermisoSchema.index({ empresaId: 1, clave: 1 }, { unique: true });
PermisoSchema.index({ empresaId: 1, nombre: 1, modulo: 1 }, { unique: true });

module.exports = mongoose.models.Permiso || mongoose.model('Permiso', PermisoSchema);