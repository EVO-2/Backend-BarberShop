const Cliente = require('../models/Cliente.model');
const Cita = require('../models/Cita.model');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Pago = require('../models/Pago.model');

const obtenerResumenDashboard = async (req, res) => {
    try {

        /* =====================================================
           📅 FECHAS
        ===================================================== */

        // 🔹 Hoy
        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);

        const finHoy = new Date();
        finHoy.setHours(23, 59, 59, 999);

        // 🔹 Últimos 7 días (incluye hoy)
        const inicioSemanaActual = new Date();
        inicioSemanaActual.setDate(inicioSemanaActual.getDate() - 6);
        inicioSemanaActual.setHours(0, 0, 0, 0);

        const finSemanaActual = new Date();
        finSemanaActual.setHours(23, 59, 59, 999);

        // 🔹 Semana anterior
        const inicioSemanaAnterior = new Date();
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 13);
        inicioSemanaAnterior.setHours(0, 0, 0, 0);

        const finSemanaAnterior = new Date();
        finSemanaAnterior.setDate(finSemanaAnterior.getDate() - 7);
        finSemanaAnterior.setHours(23, 59, 59, 999);

        /* =====================================================
           🔎 ROL BARBERO
        ===================================================== */

        const rolPeluquero = await Rol.findOne({ nombre: 'barbero', estado: true });

        if (!rolPeluquero) {
            return res.status(400).json({
                msg: 'Rol barbero no encontrado'
            });
        }

        /* =====================================================
           🚀 CONSULTAS EN PARALELO
        ===================================================== */

        const [
            totalClientes,
            citasHoy,
            ingresosHoyAgg,
            peluquerosActivos,
            ultimasCitas,
            ingresosSemanaAgg,
            ingresosSemanaAnteriorAgg,
            estadosCitas,
            serviciosTop
        ] = await Promise.all([

            // 👥 Clientes activos
            Cliente.countDocuments({ estado: true }),

            // 📅 Citas hoy (operativo, no financiero)
            Cita.countDocuments({
                fecha: { $gte: inicioHoy, $lte: finHoy }
            }),

            // 💰 Ingresos hoy (DESDE PAGOS)
            Pago.aggregate([
                {
                    $match: {
                        estado: 'pagado',
                        createdAt: { $gte: inicioHoy, $lte: finHoy }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$monto' }
                    }
                }
            ]),

            // 👨‍🔧 Peluqueros activos
            Usuario.countDocuments({
                rol: rolPeluquero._id,
                estado: true
            }),

            // 🕓 Últimas 5 citas
            Cita.find()
                .sort({ fecha: -1 })
                .limit(5)
                .populate({
                    path: 'cliente',
                    populate: { path: 'usuario', select: 'nombre' }
                })
                .populate({
                    path: 'peluquero',
                    populate: { path: 'usuario', select: 'nombre' }
                })
                .populate('servicios', 'nombre precio duracion')
                .populate('sede', 'nombre direccion'),

            // 📊 Ingresos últimos 7 días (DESDE PAGOS)
            Pago.aggregate([
                {
                    $match: {
                        estado: 'pagado',
                        createdAt: { $gte: inicioSemanaActual, $lte: finSemanaActual }
                    }
                },
                {
                    $group: {
                        _id: { $dayOfWeek: '$createdAt' },
                        total: { $sum: '$monto' }
                    }
                },
                { $sort: { _id: 1 } }
            ]),

            // 📉 Total semana anterior (DESDE PAGOS)
            Pago.aggregate([
                {
                    $match: {
                        estado: 'pagado',
                        createdAt: { $gte: inicioSemanaAnterior, $lte: finSemanaAnterior }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$monto' }
                    }
                }
            ]),

            // 📈 Estados de citas
            Cita.aggregate([
                {
                    $group: {
                        _id: '$estado',
                        total: { $sum: 1 }
                    }
                }
            ]),

            // 🏆 Servicios más solicitados
            Cita.aggregate([
                { $unwind: '$servicios' },
                {
                    $group: {
                        _id: '$servicios',
                        total: { $sum: 1 }
                    }
                },
                { $sort: { total: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'servicios',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'servicioData'
                    }
                },
                { $unwind: '$servicioData' },
                {
                    $project: {
                        _id: 0,
                        nombre: '$servicioData.nombre',
                        total: 1
                    }
                }
            ])
        ]);

        /* =====================================================
           📊 CÁLCULOS FINALES
        ===================================================== */

        const ingresosHoy = ingresosHoyAgg[0]?.total || 0;
        const totalSemanaActual = ingresosSemanaAgg.reduce((acc, item) => acc + item.total, 0);
        const totalSemanaAnterior = ingresosSemanaAnteriorAgg[0]?.total || 0;

        const variacion = totalSemanaAnterior > 0
            ? ((totalSemanaActual - totalSemanaAnterior) / totalSemanaAnterior) * 100
            : (totalSemanaActual > 0 ? 100 : 0);

        /* =====================================================
           📤 RESPUESTA
        ===================================================== */

        res.json({
            totalClientes,
            citasHoy,
            ingresosHoy,
            peluquerosActivos,
            ultimasCitas,

            ingresosSemana: ingresosSemanaAgg,
            comparacionSemana: {
                actual: totalSemanaActual,
                anterior: totalSemanaAnterior,
                variacion: Number(variacion.toFixed(2))
            },

            estadosCitas,
            serviciosTop
        });

    } catch (error) {
        console.error('Error en dashboard:', error);
        res.status(500).json({
            msg: 'Error obteniendo resumen del dashboard'
        });
    }
};

module.exports = {
    obtenerResumenDashboard
};