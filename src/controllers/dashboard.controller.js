const mongoose = require('mongoose');

const Cliente = require('../models/Cliente.model');
const Cita = require('../models/Cita.model');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Pago = require('../models/Pago.model');

const obtenerResumenDashboard = async (req, res) => {
    try {

        /* =====================================================
           🏢 SEDE
        ===================================================== */

        const { sede } = req.query;

        if (!sede || !mongoose.Types.ObjectId.isValid(sede)) {
            return res.status(400).json({
                msg: 'Debe enviar un id de sede válido'
            });
        }

        const sedeId = new mongoose.Types.ObjectId(sede);

        /* =====================================================
           📅 FECHAS
        ===================================================== */

        const inicioHoy = new Date();
        inicioHoy.setHours(0, 0, 0, 0);

        const finHoy = new Date();
        finHoy.setHours(23, 59, 59, 999);

        const inicioSemanaActual = new Date();
        inicioSemanaActual.setDate(inicioSemanaActual.getDate() - 6);
        inicioSemanaActual.setHours(0, 0, 0, 0);

        const finSemanaActual = new Date();
        finSemanaActual.setHours(23, 59, 59, 999);

        const inicioSemanaAnterior = new Date();
        inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 13);
        inicioSemanaAnterior.setHours(0, 0, 0, 0);

        const finSemanaAnterior = new Date();
        finSemanaAnterior.setDate(finSemanaAnterior.getDate() - 7);
        finSemanaAnterior.setHours(23, 59, 59, 999);

        /* =====================================================
           🔎 ROL BARBERO
        ===================================================== */

        const rolPeluquero = await Rol.findOne({
            nombre: 'barbero',
            estado: true
        });

        if (!rolPeluquero) {
            return res.status(400).json({
                msg: 'Rol barbero no encontrado'
            });
        }

        /* =====================================================
           🚀 CONSULTAS
        ===================================================== */

        const [
            citasHoy,
            ultimasCitas,
            ingresosHoyAgg,
            ingresosSemanaAgg,
            ingresosSemanaAnteriorAgg,
            estadosCitas,
            serviciosTop,
            clientesUnicos,
            peluquerosUnicos
        ] = await Promise.all([

            /* 📅 Citas hoy */

            Cita.countDocuments({
                sede: sedeId,
                fecha: { $gte: inicioHoy, $lte: finHoy }
            }),

            /* 🕓 Últimas citas */

            Cita.find({ sede: sedeId })
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

            /* 💰 Ingresos hoy */

            Pago.aggregate([
                {
                    $lookup: {
                        from: 'citas',
                        localField: 'cita',
                        foreignField: '_id',
                        pipeline: [{ $match: { sede: sedeId } }],
                        as: 'citaData'
                    }
                },
                { $unwind: '$citaData' },
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

            /* 📊 Ingresos semana */

            Pago.aggregate([
                {
                    $lookup: {
                        from: 'citas',
                        localField: 'cita',
                        foreignField: '_id',
                        pipeline: [{ $match: { sede: sedeId } }],
                        as: 'citaData'
                    }
                },
                { $unwind: '$citaData' },
                {
                    $match: {
                        estado: 'pagado',
                        createdAt: {
                            $gte: inicioSemanaActual,
                            $lte: finSemanaActual
                        }
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

            /* 📉 Semana anterior */

            Pago.aggregate([
                {
                    $lookup: {
                        from: 'citas',
                        localField: 'cita',
                        foreignField: '_id',
                        pipeline: [{ $match: { sede: sedeId } }],
                        as: 'citaData'
                    }
                },
                { $unwind: '$citaData' },
                {
                    $match: {
                        estado: 'pagado',
                        createdAt: {
                            $gte: inicioSemanaAnterior,
                            $lte: finSemanaAnterior
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$monto' }
                    }
                }
            ]),

            /* 📈 Estados citas */

            Cita.aggregate([
                { $match: { sede: sedeId } },
                {
                    $group: {
                        _id: '$estado',
                        total: { $sum: 1 }
                    }
                }
            ]),

            /* 🏆 Servicios top */

            Cita.aggregate([
                { $match: { sede: sedeId } },
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
            ]),

            /* 👥 Clientes únicos por sede */

            Cita.distinct('cliente', { sede: sedeId }),

            /* ✂️ Peluqueros únicos por sede */

            Cita.distinct('peluquero', { sede: sedeId })

        ]);

        /* =====================================================
           📊 CÁLCULOS
        ===================================================== */

        const totalClientes = clientesUnicos.length;
        const peluquerosActivos = peluquerosUnicos.length;

        const ingresosHoy = ingresosHoyAgg[0]?.total || 0;

        const totalSemanaActual =
            ingresosSemanaAgg.reduce((acc, item) => acc + item.total, 0);

        const totalSemanaAnterior =
            ingresosSemanaAnteriorAgg[0]?.total || 0;

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