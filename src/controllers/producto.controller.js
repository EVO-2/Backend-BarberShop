const Producto = require('../models/Producto.model');
const mongoose = require('mongoose');

require('../models/Categoria.model');
require('../models/Proveedor.model');
require('../models/Sede.model');

// ===============================
// Crear producto
// ===============================
const crearProducto = async (req, res) => {
    try {
        const data = req.body;

        const producto = new Producto(data);
        await producto.save();

        const productoPopulado = await Producto.findById(producto._id)
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre');

        res.status(201).json({
            ok: true,
            producto: productoPopulado
        });

    } catch (error) {
        console.error('❌ ERROR CREAR PRODUCTO:', error);
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
        const { nombre, categoria, sede, estado } = req.query;

        let filtros = {};

        // 🔥 SOLO activos por defecto
        filtros.estado = true;

        if (nombre && nombre.trim() !== '') {
            filtros.nombre = { $regex: nombre, $options: 'i' };
        }

        if (categoria && mongoose.Types.ObjectId.isValid(categoria)) {
            filtros.categoria = categoria;
        }

        if (sede && mongoose.Types.ObjectId.isValid(sede)) {
            filtros.sede = sede;
        }

        if (estado !== undefined && estado !== '') {
            filtros.estado = estado === 'true';
        }

        console.log('📡 FILTROS BACKEND:', filtros);

        const productos = await Producto.find(filtros)
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre')
            .sort({ createdAt: -1 })
            .lean(); // 🔥 mejora rendimiento

        res.json({
            ok: true,
            total: productos.length,
            productos
        });

    } catch (error) {
        console.error('❌ ERROR BACKEND PRODUCTOS:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo productos',
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
            .populate('sede', 'nombre')
            .lean();

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
        console.error('❌ ERROR OBTENER PRODUCTO:', error);
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

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
        console.error('❌ ERROR ACTUALIZAR PRODUCTO:', error);
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

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
        console.error('❌ ERROR ELIMINAR PRODUCTO:', error);
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