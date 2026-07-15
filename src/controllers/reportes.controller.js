const Cita = require('../models/Cita.model');
const Pago = require('../models/Pago.model');
const Producto = require('../models/Producto.model');
const Usuario = require('../models/Usuario.model');
const Equipo = require('../models/Equipo.model');
const Venta = require('../models/Venta.model');
const mongoose = require('mongoose');


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
      $gte: new Date(`${fechaInicio}T05:00:00.000Z`),
      $lte: new Date(new Date(`${fechaFin}T04:59:59.999Z`).getTime() + 24 * 60 * 60 * 1000)
    };

    // 🔎 Match dinámico (incluimos finalizadas por si aún no tienen pago registrado, o pagadas)
    const match = {
      estado: { $in: ['finalizada', 'pagada'] },
      fecha: rangoFechas
    };

    if (sede) {
      match.sede = new mongoose.Types.ObjectId(sede);
    }

    // Usar find y populate evita que $lookup elimine servicios duplicados en el mismo array
    const citas = await Cita.find(match)
      .populate('pago')
      .populate('sede')
      .populate({ path: 'cliente', populate: { path: 'usuario' } })
      .populate({ path: 'peluquero', populate: { path: 'usuario' } })
      .populate('servicios')
      .sort({ fecha: 1 })
      .lean();

    // Consultar Ventas pagadas en el mismo rango de fechas
    const ventasMatch = {
      estado: 'pagado',
      createdAt: rangoFechas
    };
    if (sede) {
      ventasMatch.sede = new mongoose.Types.ObjectId(sede);
    }

    const ventas = await Venta.find(ventasMatch)
      .populate('sede')
      .populate({ path: 'cliente', populate: { path: 'usuario' } })
      .populate('usuario')
      .populate('productos.producto')
      .sort({ createdAt: 1 })
      .lean();

    // =========================
    // 🔎 Procesamiento final
    // =========================

    let ingresosTotales = 0;
    let totalServicios = 0;

    const ingresosPorSede = {};
    const detalleCitas = [];

    citas.forEach((cita) => {
      // Calcular la suma real de los servicios, respetando duplicados si un cliente agendó 2 veces el mismo
      const sumaServicios = (cita.servicios || []).reduce((acc, s) => acc + (Number(s.precio) || 0), 0);
      
      // Priorizar el monto del pago, de lo contrario fallback a la suma de los servicios (el subtotal real)
      const montoPagado = cita.pago?.monto || sumaServicios;

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
        cliente: cita.cliente?.usuario?.nombre || 'N/D',
        peluquero: cita.peluquero?.usuario?.nombre || 'N/D',
        servicios: (cita.servicios || []).map(s => ({
          nombre: s.nombre,
          precio: s.precio
        })),
        subtotal: montoPagado
      });
    });

    // =========================
    // 🔎 Procesamiento Ventas
    // =========================
    
    let ingresosProductos = 0;
    const detalleVentas = [];

    ventas.forEach((venta) => {
      const montoVenta = venta.total || 0;
      ingresosProductos += montoVenta;
      ingresosTotales += montoVenta;

      const sedeNombre = venta.sede?.nombre || 'Sin sede';

      if (!ingresosPorSede[sedeNombre]) {
        ingresosPorSede[sedeNombre] = 0;
      }
      ingresosPorSede[sedeNombre] += montoVenta;

      detalleVentas.push({
        id: venta._id,
        fecha: venta.createdAt,
        sede: sedeNombre,
        cliente: venta.cliente?.usuario?.nombre || 'N/D',
        vendedor: venta.usuario?.nombre || 'N/D',
        productos: (venta.productos || []).map(p => ({
          nombre: p.producto?.nombre || 'Producto Eliminado',
          cantidad: p.cantidad,
          precioUnitario: p.precioUnitario,
          subtotal: p.subtotal
        })),
        subtotal: montoVenta
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
        cantidadVentas: detalleVentas.length,
        totalServicios,
        ingresosTotales,
        ingresosServicios: ingresosTotales - ingresosProductos,
        ingresosProductos,
        promedioPorCita:
          detalleCitas.length > 0
            ? Number(((ingresosTotales - ingresosProductos) / detalleCitas.length).toFixed(2))
            : 0
      },
      ingresosPorSede,
      detalleCitas,
      detalleVentas
    });

  } catch (error) {
    console.error("Error en reporte de ingresos:", error);
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

    const { fechaInicio, fechaFin, sede } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las fechas inicio y fin son requeridas',
      });
    }

    const rangoFechas = {
      $gte: new Date(`${fechaInicio}T05:00:00.000Z`),
      $lte: new Date(new Date(`${fechaFin}T04:59:59.999Z`).getTime() + 24 * 60 * 60 * 1000)
    };

    const match = {
      estado: { $in: ['finalizada', 'pagada'] },
      fecha: rangoFechas,
    };
    if (sede) {
      match.sede = new mongoose.Types.ObjectId(sede);
    }

    const resultado = await Cita.aggregate([

      {
        $match: match,
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

    const { fechaInicio, fechaFin, sede } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las fechas inicio y fin son requeridas',
      });
    }

    const rangoFechas = {
      $gte: new Date(`${fechaInicio}T05:00:00.000Z`),
      $lte: new Date(new Date(`${fechaFin}T04:59:59.999Z`).getTime() + 24 * 60 * 60 * 1000)
    };

    const match = {
      estado: { $in: ['finalizada', 'pagada'] },
      fecha: rangoFechas,
    };
    if (sede) {
      match.sede = new mongoose.Types.ObjectId(sede);
    }

    const resultado = await Cita.aggregate([

      {
        $match: match,
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
    const { sede } = req.query;
    const pipeline = [];

    if (sede) {
      pipeline.push({
        $match: { sede: new mongoose.Types.ObjectId(sede) }
      });
    }

    pipeline.push(
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

      { $sort: { sede: 1 } }
    );

    const resultado = await Equipo.aggregate(pipeline);

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
    const { sede } = req.query;
    const pipeline = [];

    if (sede) {
      pipeline.push({
        $match: { sede: new mongoose.Types.ObjectId(sede) }
      });
    }

    pipeline.push(
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

      { $sort: { sede: 1 } }
    );

    const resultado = await Producto.aggregate(pipeline);

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