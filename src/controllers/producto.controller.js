const Producto = require('../models/Producto.model');
const Movimiento = require('../models/Movimientos.model');
const mongoose = require('mongoose');
const HistorialService = require('../services/historial.service');

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

        // Registrar acción en auditoría
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'CREAR',
            modulo: 'PRODUCTOS',
            descripcion: `Creó el producto: ${nombre} (${tipo || 'venta'})`,
            entidadId: producto._id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

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

        // Registrar acción en auditoría
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'ACTUALIZAR',
            modulo: 'PRODUCTOS',
            descripcion: `Actualizó el producto: ${producto.nombre}`,
            entidadId: id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

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

        // Registrar acción en auditoría
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'ELIMINAR',
            modulo: 'PRODUCTOS',
            descripcion: `Eliminó el producto (soft delete): ${producto.nombre}`,
            entidadId: id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

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

const cambiarEstadoProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

        const producto = await Producto.findByIdAndUpdate(
            id,
            { estado },
            { new: true }
        );

        if (!producto) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Producto no encontrado'
            });
        }

        // Registrar acción en auditoría
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'ACTUALIZAR',
            modulo: 'PRODUCTOS',
            descripcion: `Cambió estado del producto: ${producto.nombre} a ${estado ? 'Activo' : 'Inactivo'}`,
            entidadId: id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

        res.json({
            ok: true,
            producto
        });

    } catch (error) {
        console.error('❌ ERROR CAMBIAR ESTADO:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar estado',
            error: error.message
        });
    }
};

const { eliminarArchivoMinio, BUCKET_NAME } = require('../config/minio');

// ===============================
// Subir o actualizar imagen de un producto
// ===============================
const subirImagenProducto = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ mensaje: "No se subió ninguna imagen" });
        }

        const producto = await Producto.findById(id);
        if (!producto) {
            // Si el producto no existe pero se subió imagen, eliminarla para no dejar basura
            await eliminarArchivoMinio(`${BUCKET_NAME}/${req.file.key}`);
            return res.status(404).json({ mensaje: "Producto no encontrado" });
        }

        // Obtener la URL de MinIO usando el mismo fallback seguro que en usuarios
        let imagenUrl = req.file.location;
        if (!imagenUrl) {
            const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
            const port = process.env.MINIO_PORT && process.env.MINIO_PORT !== '443' && process.env.MINIO_PORT !== '80' ? `:${process.env.MINIO_PORT}` : '';
            const minioPublicUrl = process.env.MINIO_PUBLIC_URL || `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${endpoint}${port}`;
            imagenUrl = `${minioPublicUrl}/${BUCKET_NAME}/${req.file.key}`;
        }

        // Si ya tenía imagen, borrar la anterior
        if (producto.imagen) {
            await eliminarArchivoMinio(producto.imagen);
        }

        producto.imagen = imagenUrl;
        await producto.save();

        // Registrar acción en auditoría
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'ACTUALIZAR',
            modulo: 'PRODUCTOS',
            descripcion: `Subió imagen para el producto: ${producto.nombre}`,
            entidadId: id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

        res.json({
            ok: true,
            mensaje: "Imagen actualizada exitosamente",
            imagenUrl,
            producto
        });

    } catch (error) {
        console.error("❌ Error en subirImagenProducto:", error);
        res.status(500).json({ mensaje: "Hubo un error al subir la imagen", error: error.message });
    }
};



// ===============================
// Registrar Venta (Reduce stock y crea movimiento)
// ===============================
const registrarVentaProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidadVenta } = req.body;

        if (!cantidadVenta || cantidadVenta <= 0) {
            return res.status(400).json({ ok: false, msg: 'La cantidad a vender debe ser mayor a 0' });
        }

        const producto = await Producto.findById(id);
        if (!producto) return res.status(404).json({ ok: false, msg: 'Producto no encontrado' });

        if (producto.cantidad < cantidadVenta) {
            return res.status(400).json({ ok: false, msg: 'Stock insuficiente para realizar esta venta' });
        }

        // Restar stock
        producto.cantidad -= cantidadVenta;
        await producto.save();

        // Registrar movimiento de salida para el Dashboard
        await Movimiento.create({
            producto: producto._id,
            sede: producto.sede,
            tipo: 'salida',
            cantidad: cantidadVenta,
            motivo: 'Venta Directa',
            referencia: 'Venta registrada desde inventario'
        });

        // Registrar acción en auditoría
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'ACTUALIZAR',
            modulo: 'INVENTARIO',
            descripcion: `Registró venta de ${cantidadVenta} unidades del producto: ${producto.nombre}`,
            entidadId: id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

        res.json({ ok: true, msg: 'Venta registrada correctamente', producto });

    } catch (error) {
        console.error('Error al registrar venta:', error);
        res.status(500).json({ ok: false, msg: 'Hable con el administrador' });
    }
};

module.exports = {
    crearProducto,
    obtenerProductos,
    obtenerProducto,
    actualizarProducto,
    eliminarProducto,
    cambiarEstadoProducto,
    subirImagenProducto,
    registrarVentaProducto
};