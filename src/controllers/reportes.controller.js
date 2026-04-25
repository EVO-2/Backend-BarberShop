const Cita = require('../models/Cita.model');
const Pago = require('../models/Pago.model');
const Producto = require('../models/Producto.model');
const Usuario = require('../models/Usuario.model');
const Equipo = require('../models/Equipo.model');


// =================== 📊 Reporte de Ingresos ===================
const obtenerReporteIngresos = async (req, res) => {
  try {

    const { fechaInicio, fechaFin, sede } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las fechas inicio y fin son requeridas',
      });
    }

    // 📅 Rango de fechas
    const rangoFechas = {
      $gte: new Date(`${fechaInicio}T00:00:00.000Z`),
      $lte: new Date(`${fechaFin}T23:59:59.999Z`)
    };

    // 🔎 Match dinámico
    const match = {
      estado: 'pagada',
      pago: { $ne: null },
      fechaBase: rangoFechas
    };

    if (sede) {
      match.sede = require('mongoose').Types.ObjectId(sede);
    }

    // =========================
    // 🔥 AGGREGATION PIPELINE
    // =========================
    const resultado = await Cita.aggregate([

      { $match: match },

      // Traer pago
      {
        $lookup: {
          from: 'pagos',
          localField: 'pago',
          foreignField: '_id',
          as: 'pago'
        }
      },
      { $unwind: '$pago' },

      // Traer sede
      {
        $lookup: {
          from: 'sedes',
          localField: 'sede',
          foreignField: '_id',
          as: 'sede'
        }
      },
      { $unwind: { path: '$sede', preserveNullAndEmptyArrays: true } },

      // Traer cliente
      {
        $lookup: {
          from: 'clientes',
          localField: 'cliente',
          foreignField: '_id',
          as: 'cliente'
        }
      },
      { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'usuarios',
          localField: 'cliente.usuario',
          foreignField: '_id',
          as: 'clienteUsuario'
        }
      },
      { $unwind: { path: '$clienteUsuario', preserveNullAndEmptyArrays: true } },

      // Traer peluquero
      {
        $lookup: {
          from: 'peluqueros',
          localField: 'peluquero',
          foreignField: '_id',
          as: 'peluquero'
        }
      },
      { $unwind: { path: '$peluquero', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'usuarios',
          localField: 'peluquero.usuario',
          foreignField: '_id',
          as: 'peluqueroUsuario'
        }
      },
      { $unwind: { path: '$peluqueroUsuario', preserveNullAndEmptyArrays: true } },

      // Traer servicios
      {
        $lookup: {
          from: 'servicios',
          localField: 'servicios',
          foreignField: '_id',
          as: 'servicios'
        }
      },

      // Ordenar por fecha
      { $sort: { fecha: 1 } }

    ]);

    // =========================
    // 🔎 Procesamiento final
    // =========================

    let ingresosTotales = 0;
    let totalServicios = 0;

    const ingresosPorSede = {};
    const detalleCitas = [];

    resultado.forEach((cita) => {

      const montoPagado = cita.pago?.monto || 0;

      ingresosTotales += montoPagado;
      totalServicios += cita.servicios?.length || 0;

      const sedeNombre = cita.sede?.nombre || 'Sin sede';

      if (!ingresosPorSede[sedeNombre]) {
        ingresosPorSede[sedeNombre] = 0;
      }

      ingresosPorSede[sedeNombre] += montoPagado;

      detalleCitas.push({
        id: cita._id,
        fecha: cita.fecha,
        sede: sedeNombre,
        cliente: cita.clienteUsuario?.nombre || 'N/D',
        peluquero: cita.peluqueroUsuario?.nombre || 'N/D',
        servicios: (cita.servicios || []).map(s => ({
          nombre: s.nombre,
          precio: s.precio
        })),
        subtotal: montoPagado
      });

    });

    // =========================
    // 📤 Respuesta
    // =========================

    res.json({
      ok: true,
      rango: {
        desde: fechaInicio,
        hasta: fechaFin
      },
      resumen: {
        cantidadCitas: detalleCitas.length,
        totalServicios,
        ingresosTotales,
        promedioPorCita:
          detalleCitas.length > 0
            ? Number((ingresosTotales / detalleCitas.length).toFixed(2))
            : 0
      },
      ingresosPorSede,
      detalle: detalleCitas
    });

  } catch (error) {

    res.status(500).json({
      ok: false,
      mensaje: 'Error al generar el reporte de ingresos',
      error: error.message
    });

  }
};


// =================== 💈 Reporte de Citas por Barbero ===================
const obtenerReporteCitasPorBarbero = async (req, res) => {
  try {

    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las fechas inicio y fin son requeridas',
      });
    }

    const rangoFechas = {
      $gte: new Date(`${fechaInicio}T00:00:00.000Z`),
      $lte: new Date(`${fechaFin}T23:59:59.999Z`),
    };

    const resultado = await Cita.aggregate([

      {
        $match: {
          estado: { $in: ['finalizada', 'pagada'] },
          fechaBase: rangoFechas,
        },
      },

      // 🔹 traer peluquero
      {
        $lookup: {
          from: 'peluqueros',
          localField: 'peluquero',
          foreignField: '_id',
          as: 'peluquero',
        },
      },

      { $unwind: '$peluquero' },

      // 🔹 traer usuario del peluquero
      {
        $lookup: {
          from: 'usuarios',
          localField: 'peluquero.usuario',
          foreignField: '_id',
          as: 'usuario',
        },
      },

      { $unwind: '$usuario' },

      // 🔹 traer sede
      {
        $lookup: {
          from: 'sedes',
          localField: 'sede',
          foreignField: '_id',
          as: 'sede',
        },
      },

      { $unwind: { path: '$sede', preserveNullAndEmptyArrays: true } },

      // 🔹 ahora agrupamos
      {
        $group: {
          _id: {
            peluquero: '$usuario.nombre',
            sede: '$sede.nombre',
          },
          cantidadCitas: { $sum: 1 },
        },
      },

      {
        $project: {
          _id: 0,
          sede: '$_id.sede',
          peluquero: '$_id.peluquero',
          cantidadCitas: 1,
        },
      },

      { $sort: { cantidadCitas: -1 } }

    ]);

    res.json(resultado);

  } catch (error) {

    res.status(500).json({
      ok: false,
      mensaje: 'Error generando reporte de citas por barbero',
      error: error.message,
    });

  }
};


// =================== 👥 Reporte de Clientes Frecuentes ===================
const obtenerReporteClientesFrecuentes = async (req, res) => {
  try {

    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las fechas inicio y fin son requeridas',
      });
    }

    const rangoFechas = {
      $gte: new Date(`${fechaInicio}T00:00:00.000Z`),
      $lte: new Date(`${fechaFin}T23:59:59.999Z`),
    };

    const resultado = await Cita.aggregate([

      {
        $match: {
          estado: { $in: ['finalizada', 'pagada'] },
          fechaBase: rangoFechas,
        },
      },

      // 🔹 traer cliente
      {
        $lookup: {
          from: 'clientes',
          localField: 'cliente',
          foreignField: '_id',
          as: 'cliente',
        },
      },

      { $unwind: '$cliente' },

      // 🔹 traer usuario del cliente
      {
        $lookup: {
          from: 'usuarios',
          localField: 'cliente.usuario',
          foreignField: '_id',
          as: 'usuario',
        },
      },

      { $unwind: '$usuario' },

      // 🔹 traer sede
      {
        $lookup: {
          from: 'sedes',
          localField: 'sede',
          foreignField: '_id',
          as: 'sede',
        },
      },

      { $unwind: { path: '$sede', preserveNullAndEmptyArrays: true } },

      // 🔹 agrupamos después de tener todos los datos
      {
        $group: {
          _id: {
            cliente: '$usuario.nombre',
            sede: '$sede.nombre',
          },
          cantidadCitas: { $sum: 1 },
        },
      },

      {
        $project: {
          _id: 0,
          sede: '$_id.sede',
          cliente: '$_id.cliente',
          cantidadCitas: 1,
        },
      },

      { $sort: { cantidadCitas: -1 } },
      { $limit: 10 }

    ]);

    res.json(resultado);

  } catch (error) {

    res.status(500).json({
      ok: false,
      mensaje: 'Error generando reporte de clientes frecuentes',
      error: error.message,
    });

  }
};


// =================== 📦 Reporte de Inventario ===================
const obtenerReporteInventario = async (req, res) => {
  try {
    const resultado = await Equipo.aggregate([
      // 1️⃣ Agrupar por sede y tipo de equipo
      {
        $group: {
          _id: {
            sede: '$sede',
            tipo: '$tipo',
          },
          cantidad: { $sum: 1 },
        },
      },

      // 2️⃣ Lookup para traer nombre de la sede
      {
        $lookup: {
          from: 'sedes',
          localField: '_id.sede',
          foreignField: '_id',
          as: 'sede',
        },
      },
      { $unwind: '$sede' },

      // 3️⃣ Agrupar nuevamente por sede
      {
        $group: {
          _id: '$sede.nombre',
          equipos: {
            $push: {
              tipo: '$_id.tipo',
              cantidad: '$cantidad',
            },
          },
          totalSede: { $sum: '$cantidad' }, // 🔥 total real
        },
      },

      // 4️⃣ Formato final limpio
      {
        $project: {
          _id: 0,
          sede: '$_id',
          equipos: 1,
          totalSede: 1,
        },
      },

      { $sort: { sede: 1 } },
    ]);

    res.json({
      ok: true,
      reporte: resultado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error generando reporte de inventario',
      error: error.message,
    });
  }
};

// =================== 📦 Reporte de Productos ===================
const obtenerReporteProductos = async (req, res) => {
  try {
    const resultado = await Producto.aggregate([
      // 1️⃣ Agrupar por sede y categoría, sumando cantidades reales
      {
        $group: {
          _id: {
            sede: '$sede',
            categoria: '$categoria',
          },
          cantidadTotal: { $sum: '$cantidad' },
        },
      },

      // 2️⃣ Lookup para traer nombre de la sede
      {
        $lookup: {
          from: 'sedes',
          localField: '_id.sede',
          foreignField: '_id',
          as: 'sede',
        },
      },
      { $unwind: { path: '$sede', preserveNullAndEmptyArrays: true } },

      // 3️⃣ Lookup para traer nombre de la categoría
      {
        $lookup: {
          from: 'categorias',
          localField: '_id.categoria',
          foreignField: '_id',
          as: 'categoria',
        },
      },
      { $unwind: { path: '$categoria', preserveNullAndEmptyArrays: true } },

      // 4️⃣ Agrupar nuevamente por sede
      {
        $group: {
          _id: '$sede.nombre',
          categorias: {
            $push: {
              categoria: '$categoria.nombre',
              cantidad: '$cantidadTotal',
            },
          },
          totalSede: { $sum: '$cantidadTotal' },
        },
      },

      // 5️⃣ Formato final limpio
      {
        $project: {
          _id: 0,
          sede: { $ifNull: ['$_id', 'Sin Sede'] },
          categorias: 1,
          totalSede: 1,
        },
      },

      { $sort: { sede: 1 } },
    ]);

    res.json({
      ok: true,
      reporte: resultado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: 'Error generando reporte de productos',
      error: error.message,
    });
  }
};

// =================== Exportaciones ===================
module.exports = {
  obtenerReporteIngresos,
  obtenerReporteCitasPorBarbero,
  obtenerReporteClientesFrecuentes,
  obtenerReporteInventario,
  obtenerReporteProductos,
};