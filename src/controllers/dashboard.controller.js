const Cliente = require('../models/Cliente.model');
const Cita = require('../models/Cita.model');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');

const obtenerRangoSemana = (offsetDias = 0) => {
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(inicio.getDate() - offsetDias);

    const fin = new Date(inicio);
    fin.setDate(inicio.getDate() + 6);
    fin.setHours(23, 59, 59, 999);

    return { inicio, fin };
};

const obtenerResumenDashboard = async (req, res) => {
    try {

        // 📅 Hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const finHoy = new Date();
        finHoy.setHours(23, 59, 59, 999);

        // 📅 Semana actual
        const semanaActual = obtenerRangoSemana(6);

        // 📅 Semana anterior
        const semanaAnterior = obtenerRangoSemana(13);

        const rolPeluquero = await Rol.findOne({ nombre: 'barbero', estado: true });

        if (!rolPeluquero) {
            return res.status(400).json({
                msg: 'Rol peluquero no encontrado'
            });
        }

        const [
            totalClientes,
            citasHoy,
            ingresosHoy,
            peluquerosActivos,
            ultimasCitas,
            ingresosSemana,
            ingresosSemanaAnterior,
            estadosCitas,
            serviciosTop
        ] = await Promise.all([

            Cliente.countDocuments({ estado: true }),

            Cita.countDocuments({
                fecha: { $gte: hoy, $lte: finHoy }
            }),

            Cita.aggregate([
                { $match: { fecha: { $gte: hoy, $lte: finHoy }, estado: 'finalizada' } },
                {
                    $lookup: {
                        from: 'pagos',
                        localField: 'pago',
                        foreignField: '_id',
                        as: 'pagoData'
                    }
                },
                { $unwind: '$pagoData' },
                { $group: { _id: null, total: { $sum: '$pagoData.monto' } } }
            ]),

            Usuario.countDocuments({
                rol: rolPeluquero._id,
                estado: true
            }),

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

            // 📊 Ingresos últimos 7 días agrupados por día
            Cita.aggregate([
                {
                    $match: {
                        fecha: { $gte: semanaActual.inicio, $lte: semanaActual.fin },
                        estado: 'finalizada'
                    }
                },
                {
                    $lookup: {
                        from: 'pagos',
                        localField: 'pago',
                        foreignField: '_id',
                        as: 'pagoData'
                    }
                },
                { $unwind: '$pagoData' },
                {
                    $group: {
                        _id: { $dayOfWeek: '$fecha' },
                        total: { $sum: '$pagoData.monto' }
                    }
                }
            ]),

            // 📉 Semana anterior total
            Cita.aggregate([
                {
                    $match: {
                        fecha: { $gte: semanaAnterior.inicio, $lte: semanaAnterior.fin },
                        estado: 'finalizada'
                    }
                },
                {
                    $lookup: {
                        from: 'pagos',
                        localField: 'pago',
                        foreignField: '_id',
                        as: 'pagoData'
                    }
                },
                { $unwind: '$pagoData' },
                { $group: { _id: null, total: { $sum: '$pagoData.monto' } } }
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

            // 🏆 Servicios más prestados
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
                        nombre: '$servicioData.nombre',
                        total: 1
                    }
                }
            ])
        ]);

        const totalSemanaActual = ingresosSemana.reduce((acc, item) => acc + item.total, 0);
        const totalSemanaAnterior = ingresosSemanaAnterior[0]?.total || 0;

        res.json({
            totalClientes,
            citasHoy,
            ingresosHoy: ingresosHoy[0]?.total || 0,
            peluquerosActivos,
            ultimasCitas,

            ingresosSemana,
            comparacionSemana: {
                actual: totalSemanaActual,
                anterior: totalSemanaAnterior,
                variacion: totalSemanaAnterior
                    ? ((totalSemanaActual - totalSemanaAnterior) / totalSemanaAnterior) * 100
                    : 100
            },

            estadosCitas,
            serviciosTop
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            msg: 'Error obteniendo resumen del dashboard'
        });
    }
};

module.exports = {
    obtenerResumenDashboard
};