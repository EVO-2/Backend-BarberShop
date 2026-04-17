const Producto = require('../models/Producto.model');
const mongoose = require('mongoose');

// ===============================
// Crear producto
// ===============================
const crearProducto = async (req, res) => {
    try {
        const data = req.body;

        const producto = new Producto(data);
        await producto.save();

        res.status(201).json({
            ok: true,
            producto
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al crear producto',
            error: error.message
        });
    }
};

// ===============================
// Obtener productos (con filtros)
// ===============================
const obtenerProductos = async (req, res) => {
    try {
        const { desde = 0, limite = 10, busqueda = '' } = req.query;

        const query = {
            estado: true
        };

        // 🔍 búsqueda por nombre
        if (busqueda) {
            query.$text = { $search: busqueda };
        }

        const [total, productos] = await Promise.all([
            Producto.countDocuments(query),
            Producto.find(query)
                .skip(Number(desde))
                .limit(Number(limite))
                .populate('categoria', 'nombre')
                .populate('proveedor', 'nombre')
                .populate('sede', 'nombre')
                .sort({ createdAt: -1 })
        ]);

        res.json({
            ok: true,
            total,
            productos
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener productos',
            error: error.message
        });
    }
};

// ===============================
// Obtener producto por ID
// ===============================
const obtenerProducto = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

        const producto = await Producto.findById(id)
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre');

        if (!producto || !producto.estado) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            ok: true,
            producto
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener producto',
            error: error.message
        });
    }
};

// ===============================
// Actualizar producto
// ===============================
const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const producto = await Producto.findByIdAndUpdate(
            id,
            data,
            { new: true }
        )
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre');

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            ok: true,
            producto
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar producto',
            error: error.message
        });
    }
};

// ===============================
// Eliminar producto (SOFT DELETE)
// ===============================
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        const producto = await Producto.findByIdAndUpdate(
            id,
            { estado: false },
            { new: true }
        );

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            ok: true,
            mensaje: 'Producto eliminado (soft delete)',
            producto
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar producto',
            error: error.message
        });
    }
};

module.exports = {
    crearProducto,
    obtenerProductos,
    obtenerProducto,
    actualizarProducto,
    eliminarProducto
};