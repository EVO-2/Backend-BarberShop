const mongoose = require('mongoose');

const PermisoSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        modulo: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        descripcion: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Permiso', PermisoSchema);