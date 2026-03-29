const mongoose = require('mongoose');

const proveedorSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    contacto: {
        nombre: { type: String, trim: true },
        telefono: { type: String, trim: true },
        email: { type: String, trim: true }
    },
    direccion: {
        type: String,
        trim: true
    },
    empresa: {
        type: String,
        trim: true
    },
    activo: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Proveedor', proveedorSchema);