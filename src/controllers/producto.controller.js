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
        const {
            nombre,
            categoria,
            proveedor,
            sede,
            tipo,
            cantidad,
            precio,
            imagen
        } = req.body;

        // 🔴 Validar ObjectId
        if (
            !mongoose.Types.ObjectId.isValid(categoria) ||
            !mongoose.Types.ObjectId.isValid(proveedor) ||
            !mongoose.Types.ObjectId.isValid(sede)
        ) {
            return res.status(400).json({
                ok: false,
                mensaje: 'IDs inválidos (categoria/proveedor/sede)'
            });
        }

        // 🔴 Validar existencia real
        const [cat, prov, sed] = await Promise.all([
            mongoose.model('Categoria').findById(categoria),
            mongoose.model('Proveedor').findById(proveedor),
            mongoose.model('Sede').findOne({
                _id: sede,
                $or: [{ estado: true }, { activo: true }]
            })
        ]);

        if (!cat) {
            return res.status(400).json({ ok: false, mensaje: 'Categoría inválida' });
        }

        if (!prov) {
            return res.status(400).json({ ok: false, mensaje: 'Proveedor inválido' });
        }

        if (!sed) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Sede no válida o inactiva'
            });
        }

        const producto = new Producto({
            nombre: nombre?.trim(),
            categoria,
            proveedor,
            sede,
            tipo: tipo || 'venta',
            cantidad: cantidad ?? 0,
            precio: precio ?? 0,
            imagen: imagen || null,
            estado: true
        });

        await producto.save();

        const productoPopulado = await Producto.findById(producto._id)
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre')
            .lean();

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
// Obtener productos
// ===============================
const obtenerProductos = async (req, res) => {
    try {
        const { nombre, categoria, sede, estado } = req.query;

        let filtros = {
            estado: true
        };

        if (nombre?.trim()) {
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
            .lean();

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

        // 🔴 Validar IDs
        if (data.categoria && !mongoose.Types.ObjectId.isValid(data.categoria)) {
            return res.status(400).json({ ok: false, mensaje: 'Categoría inválida' });
        }

        if (data.proveedor && !mongoose.Types.ObjectId.isValid(data.proveedor)) {
            return res.status(400).json({ ok: false, mensaje: 'Proveedor inválido' });
        }

        if (data.sede && !mongoose.Types.ObjectId.isValid(data.sede)) {
            return res.status(400).json({ ok: false, mensaje: 'Sede inválida' });
        }

        // 🔴 Validar sede activa
        if (data.sede) {
            const sede = await mongoose.model('Sede').findOne({
                _id: data.sede,
                $or: [{ estado: true }, { activo: true }]
            });

            if (!sede) {
                return res.status(400).json({
                    ok: false,
                    mensaje: 'Sede no válida o inactiva'
                });
            }
        }

        const producto = await Producto.findByIdAndUpdate(
            id,
            data,
            {
                new: true,
                runValidators: true
            }
        )
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre')
            .lean();

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
// Eliminar producto (soft delete)
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
        )
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre')
            .lean();

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

// ===============================
// 🔴 Desactivar producto
// ===============================
const desactivarProducto = async (req, res) => {
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
        )
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre')
            .lean();

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            ok: true,
            mensaje: 'Producto desactivado',
            producto
        });

    } catch (error) {
        console.error('❌ ERROR DESACTIVAR PRODUCTO:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al desactivar producto',
            error: error.message
        });
    }
};

// ===============================
// 🟢 Activar producto
// ===============================
const activarProducto = async (req, res) => {
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
            { estado: true },
            { new: true }
        )
            .populate('categoria', 'nombre')
            .populate('proveedor', 'nombre')
            .populate('sede', 'nombre')
            .lean();

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        res.json({
            ok: true,
            mensaje: 'Producto activado',
            producto
        });

    } catch (error) {
        console.error('❌ ERROR ACTIVAR PRODUCTO:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al activar producto',
            error: error.message
        });
    }
};

module.exports = {
    crearProducto,
    obtenerProductos,
    obtenerProducto,
    actualizarProducto,
    eliminarProducto,
    desactivarProducto,
    activarProducto
};