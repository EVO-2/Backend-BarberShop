const Cita = require('../models/Cita.model');
const Pago = require('../models/Pago.model');
const Producto = require('../models/Producto.model');
const Usuario = require('../models/Usuario.model');

// =================== 📊 Reporte de Ingresos ===================
const obtenerReporteIngresos = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Las fechas inicio y fin son requeridas',
      });
    }

    const filtroFechas = {
      fecha: {
        $gte: new Date(fechaInicio),
        $lte: new Date(fechaFin),
      },
    };

    const citas = await Cita.find({
      estado: 'finalizada',
      ...filtroFechas,
    })
      .populate('pago')
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre' },
      })
      .populate({
        path: 'peluquero',
        populate: { path: 'usuario', select: 'nombre' },
      })
      .populate('servicios', 'nombre precio')
      .sort({ fecha: 1 });

    let ingresosTotales = 0;
    let totalServicios = 0;

    const detalleCitas = citas.map((cita) => {
      const subtotal =
        cita.servicios?.reduce((acc, s) => acc + (s.precio || 0), 0) || 0;

      ingresosTotales += subtotal;
      totalServicios += cita.servicios?.length || 0;

      return {
        id: cita._id,
        fecha: cita.fecha,
        cliente: cita.cliente?.usuario?.nombre || 'N/D',
        peluquero: cita.peluquero?.usuario?.nombre || 'N/D',
        servicios: cita.servicios?.map((s) => ({
          nombre: s.nombre,
          precio: s.precio,
        })),
        subtotal,
      };
    });

    res.json({
      ok: true,
      rango: { desde: fechaInicio, hasta: fechaFin },
      resumen: {
        cantidadCitas: citas.length,
        totalServicios,
        ingresosTotales,
        promedioPorCita:
          citas.length > 0 ? (ingresosTotales / citas.length).toFixed(2) : 0,
      },
      detalle: detalleCitas,
    });
  } catch (error) {
    console.error('❌ Error al obtener reporte de ingresos:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al generar el reporte de ingresos',
      error: error.message,
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

    const resultado = await Cita.aggregate([
      {
        $match: {
          estado: 'finalizada',
          fecha: { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) },
        },
      },
      {
        $group: {
          _id: '$peluquero',  
          cantidadCitas: { $sum: 1 },
        },
      },

      // 1️⃣ Lookup hacia Peluquero
      {
        $lookup: {
          from: 'peluqueros',    
          localField: '_id',
          foreignField: '_id',
          as: 'peluquero',
        },
      },
      { $unwind: { path: '$peluquero', preserveNullAndEmptyArrays: true } },

      // 2️⃣ Lookup hacia Usuario (para obtener nombre)
      {
        $lookup: {
          from: 'usuarios',
          localField: 'peluquero.usuario',
          foreignField: '_id',
          as: 'usuario',
        },
      },
      { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },

      // 3️⃣ Proyecto final limpio
      {
        $project: {
          _id: 0,
          peluquero: '$usuario.nombre', 
          cantidadCitas: 1,
        },
      },

      { $sort: { cantidadCitas: -1 } },
    ]);

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener reporte de citas por barbero:', error);
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

    const resultado = await Cita.aggregate([
      {
        $match: {
          estado: 'finalizada',
          fecha: { $gte: new Date(fechaInicio), $lte: new Date(fechaFin) },
        },
      },
      {
        $group: {
          _id: '$cliente',  
          cantidadCitas: { $sum: 1 },
        },
      },

      // 1️⃣ Lookup hacia Cliente
      {
        $lookup: {
          from: 'clientes',
          localField: '_id',        // aquí llega el ID del cliente
          foreignField: '_id',      // ID de cliente coincide ✔️
          as: 'cliente',
        },
      },
      { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },

      // 2️⃣ Lookup hacia Usuario para obtener el nombre
      {
        $lookup: {
          from: 'usuarios',
          localField: 'cliente.usuario',
          foreignField: '_id',
          as: 'usuario',
        },
      },
      { $unwind: { path: '$usuario', preserveNullAndEmptyArrays: true } },

      // 3️⃣ Proyección limpia
      {
        $project: {
          _id: 0,
          cliente: '$usuario.nombre',
          cantidadCitas: 1,
        },
      },

      { $sort: { cantidadCitas: -1 } },
      { $limit: 10 },
    ]);

    res.json(resultado);
  } catch (error) {
    console.error('❌ Error al obtener reporte de clientes frecuentes:', error);
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
    const productos = await Producto.find({}, 'nombre stock usosVendidos');
    const reporte = productos.map((p) => ({
      producto: p.nombre,
      stock: p.stock,
      usosVendidos: p.usosVendidos || 0,
    }));

    // Devuelve un array limpio directamente
    res.json(reporte);
  } catch (error) {
    console.error('❌ Error al obtener reporte de inventario:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error generando reporte de inventario',
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
};
