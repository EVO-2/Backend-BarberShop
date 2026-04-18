const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    descripcion: {
        type: String,
        default: ''
    },
    estado: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.models.Categoria || mongoose.model('Categoria', categoriaSchema);