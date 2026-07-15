const Venta = require('../models/Venta.model');
const Producto = require('../models/Producto.model');
const Movimiento = require('../models/Movimientos.model');
const mongoose = require('mongoose');
const HistorialService = require('../services/historial.service');
const { EstadosPago } = require('../constants');

// ===============================
// Registrar Venta (POS)
// ===============================
const registrarVenta = async (req, res) => {
    // Iniciar una sesión para transacción
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productos, metodoPago, observaciones, cliente } = req.body;

        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ ok: false, msg: 'El carrito de ventas está vacío' });
        }

        if (!metodoPago) {
            return res.status(400).json({ ok: false, msg: 'Debe especificar un método de pago' });
        }

        let total = 0;
        let sedeId = null;
        let empresaId = null;
        const productosVendidos = [];

        for (const item of productos) {
            const { producto: productoId, cantidad } = item;

            if (!cantidad || cantidad <= 0) {
                throw new Error('La cantidad a vender debe ser mayor a 0');
            }

            const producto = await Producto.findById(productoId).session(session);
            if (!producto) {
                throw new Error(`Producto con ID ${productoId} no encontrado`);
            }

            if (!producto.estado) {
                throw new Error(`El producto ${producto.nombre} está inactivo`);
            }

            if (producto.cantidad < cantidad) {
                throw new Error(`Stock insuficiente para ${producto.nombre}. Stock actual: ${producto.cantidad}`);
            }

            // Validar que todos los productos sean de la misma sede y empresa
            if (!sedeId) {
                sedeId = producto.sede;
                empresaId = producto.empresaId;
            } else if (sedeId.toString() !== producto.sede.toString()) {
                throw new Error('No se pueden vender productos de diferentes sedes en la misma transacción');
            }

            const subtotal = producto.precio * cantidad;
            total += subtotal;

            productosVendidos.push({
                producto: producto._id,
                cantidad,
                precioUnitario: producto.precio,
                subtotal
            });

            // Restar stock
            producto.cantidad -= cantidad;
            await producto.save({ session });

            // Registrar movimiento de salida
            await Movimiento.create([{
                producto: producto._id,
                sede: producto.sede,
                tipo: 'salida',
                cantidad,
                motivo: 'Venta Directa',
                referencia: `Venta registrada por POS`
            }], { session });
        }

        // Crear registro de Venta
        const nuevaVenta = new Venta({
            empresaId,
            sede: sedeId,
            usuario: req.usuario._id,
            cliente: cliente || null,
            productos: productosVendidos,
            total,
            metodoPago,
            estado: 'pagado',
            observaciones: observaciones || null
        });

        await nuevaVenta.save({ session });

        // Confirmar transacción
        await session.commitTransaction();
        session.endSession();

        // Registrar acción en auditoría (fuera de la transacción por si falla algo de la auditoría, no deshaga la venta)
        HistorialService.registrarAccion({
            usuario: req.usuario._id,
            accion: 'CREAR',
            modulo: 'VENTAS',
            descripcion: `Registró venta POS en sede. Total: $${total}`,
            entidadId: nuevaVenta._id,
            ip: req.ip || req.connection.remoteAddress,
            dispositivo: req.headers['user-agent']
        });

        res.status(201).json({
            ok: true,
            msg: 'Venta registrada exitosamente',
            venta: nuevaVenta
        });

    } catch (error) {
        // Deshacer transacción
        await session.abortTransaction();
        session.endSession();
        console.error('Error al registrar venta:', error);
        res.status(400).json({ ok: false, msg: error.message || 'Error al registrar venta' });
    }
};

// ===============================
// Obtener Ventas
// ===============================
const obtenerVentas = async (req, res) => {
    try {
        const { sede, desde, hasta } = req.query;
        let filtros = {};

        if (sede && mongoose.Types.ObjectId.isValid(sede)) {
            filtros.sede = sede;
        }

        // Si el usuario no es admin/superadmin, forzar la sede a la que pertenece
        // (Esto depende de cómo se manejen los permisos globalmente, pero como medida de seguridad)
        if (req.usuario.rol !== 'admin' && req.usuario.rol !== 'superadmin' && req.usuario.sede) {
             filtros.sede = req.usuario.sede;
        }

        if (desde || hasta) {
            filtros.createdAt = {};
            if (desde) filtros.createdAt.$gte = new Date(desde);
            if (hasta) filtros.createdAt.$lte = new Date(hasta);
        }

        const ventas = await Venta.find(filtros)
            .populate('usuario', 'nombre apellido')
            .populate('cliente', 'nombre apellido')
            .populate('productos.producto', 'nombre imagen categoria')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            ok: true,
            ventas
        });

    } catch (error) {
        console.error('Error al obtener ventas:', error);
        res.status(500).json({ ok: false, msg: 'Error al obtener el historial de ventas' });
    }
};

module.exports = {
    registrarVenta,
    obtenerVentas
};
