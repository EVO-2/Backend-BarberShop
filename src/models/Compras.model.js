const mongoose = require('mongoose');

const compraSchema = new mongoose.Schema({
    proveedor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Proveedor',
        required: true
    },
    sede: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sede',
        required: true
    },
    productos: [
        {
            producto: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Producto'
            },
            cantidad: { type: Number, required: true, min: 1 },
            precioCompra: { type: Number, required: true, min: 0 }
        }
    ],
    total: {
        type: Number,
        required: true,
        min: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Compra', compraSchema);