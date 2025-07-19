// ===================== imports y registro de modelos =====================
const Cliente        = require('../models/Cliente.model');
const Peluquero      = require('../models/Peluquero.model');
const Servicio       = require('../models/Servicio.model');
const Sede           = require('../models/Sede.model');
const PuestoTrabajo  = require('../models/PuestoTrabajo.model');
const Pago           = require('../models/Pago.model');
const Cita           = require('../models/Cita.model');

// ===================== crear una nueva cita =============================
const crearCita = async (req, res) => {
  try {
    const { cliente, peluquero, fecha, sede } = req.body;

    const yaExiste = await Cita.findOne({ peluquero, fecha, sede });
    if (yaExiste) {
      return res.status(400).json({ msg: 'Ya existe una cita para ese peluquero en esa fecha y hora.' });
    }

    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const citasDelDia = await Cita.find({
      sede,
      fecha: { $gte: fechaInicio, $lte: fechaFin }
    }).sort({ turno: 1 });

    const nuevoTurno = citasDelDia.length > 0
      ? citasDelDia[citasDelDia.length - 1].turno + 1
      : 1;

    const nuevaCita = await Cita.create({ ...req.body, turno: nuevoTurno });

    const citaConDatos = await Cita.findById(nuevaCita._id)
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({
        path: 'peluquero',
        populate: { path: 'usuario', select: 'nombre correo' }
      })
      .populate('servicios sede puestoTrabajo pago');

    res.status(201).json(citaConDatos);
  } catch (error) {
    console.error('❌ Error al crear cita:', error);
    res.status(500).json({ msg: 'Error interno del servidor' });
  }
};

// ===================== obtener una cita por ID ===========================
const obtenerCitaPorId = async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });
    res.json(cita);
  } catch (error) {
    console.error('❌ Error al buscar la cita:', error);
    res.status(500).json({ mensaje: 'Error al buscar la cita' });
  }
};

// ===================== actualizar una cita ===============================
const actualizarCita = async (req, res) => {
  try {
    const { servicios, sede, puestoTrabajo } = req.body;

    if (servicios) {
      const serviciosValidos = await Servicio.find({ _id: { $in: servicios }, estado: true });
      if (serviciosValidos.length !== servicios.length) {
        return res.status(400).json({ mensaje: 'Uno o más servicios no existen o están inactivos' });
      }
    }

    if (sede && !(await Sede.exists({ _id: sede, estado: true })))
      return res.status(400).json({ mensaje: 'Sede no válida o inactiva' });

    if (puestoTrabajo && !(await PuestoTrabajo.exists({ _id: puestoTrabajo, estado: true })))
      return res.status(400).json({ mensaje: 'Puesto de trabajo no válido o inactivo' });

    const citaActualizada = await Cita.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    if (!citaActualizada)
      return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json(citaActualizada);
  } catch (error) {
    console.error('❌ Error al actualizar la cita:', error);
    res.status(500).json({ mensaje: 'Error al actualizar la cita' });
  }
};

// ===================== cancelar una cita ================================
const cancelarCita = async (req, res) => {
  try {
    const cita = await Cita.findByIdAndUpdate(
      req.params.id,
      { estado: 'cancelada' },
      { new: true }
    )
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    if (!cita)
      return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json({ mensaje: 'Cita cancelada exitosamente', cita });
  } catch (error) {
    console.error('❌ Error al cancelar la cita:', error);
    res.status(500).json({ mensaje: 'Error al cancelar la cita' });
  }
};

// ===================== citas del cliente logueado ========================
const obtenerCitasDelCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ usuario: req.uid });
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    const citas = await Cita.find({ cliente: cliente._id })
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({
        path: 'peluquero',
        populate: { path: 'usuario', select: 'nombre correo' }
      })
      .populate('servicios sede puestoTrabajo pago')
      .sort({ fecha: 1, hora: 1 });

    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas del cliente:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del cliente' });
  }
};

// ===================== citas del peluquero logueado ======================
const obtenerCitasDelPeluquero = async (req, res) => {
  try {
    const peluquero = await Peluquero.findOne({ usuario: req.uid });
    if (!peluquero) return res.status(404).json({ mensaje: 'Peluquero no encontrado' });

    const citas = await Cita.find({ peluquero: peluquero._id })
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');

    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas del peluquero:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del peluquero' });
  }
};

// ===================== obtener todas las citas ===========================
const obtenerCitas = async (_req, res) => {
  try {
    const citas = await Cita.find()
      .populate({
        path: 'cliente',
        populate: { path: 'usuario', select: 'nombre correo' },
        select: 'telefono direccion'
      })
      .populate({ path: 'peluquero', populate: { path: 'usuario', select: 'nombre correo' } })
      .populate('servicios sede puestoTrabajo pago');
    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// ===================== Finalizar cita ==========================
const finalizarCita = async (req, res) => {
  const { id } = req.params;
  try {
    const cita = await Cita.findById(id);
    if (!cita) return res.status(404).json({ mensaje: 'Cita no encontrada' });

    cita.estado = 'finalizada';
    await cita.save();

    res.json({ mensaje: 'Cita finalizada correctamente', cita });
  } catch (error) {
    console.error('Error al finalizar cita:', error);
    res.status(500).json({ mensaje: 'Error al finalizar la cita' });
  }
};

// ===================== listarMisCitas ===========================
const listarMisCitas = async (req, res) => {
  const { uid } = req.usuario;

  try {
    const citas = await Cita.findAll({
      where: { cliente_id: uid },
      include: [
        {
          model: Cliente,
          include: [
            {
              model: Usuario,
              as: 'usuario', // Alias definido en el modelo
              attributes: ['nombre', 'correo', 'telefono', 'direccion']
            }
          ]
        },
        {
          model: Peluquero,
          include: [
            {
              model: Usuario,
              as: 'usuario',
              attributes: ['nombre', 'correo']
            }
          ]
        },
        {
          model: Servicio,
          attributes: ['nombre', 'precio']
        },
        {
          model: Sede,
          attributes: ['nombre']
        },
        {
          model: PuestoTrabajo,
          attributes: ['nombre']
        },
        {
          model: Pago,
          attributes: ['monto', 'metodo', 'estado']
        }
      ]
    });

    res.json(citas);
  } catch (error) {
    console.error('Error al listar citas del cliente:', error);
    res.status(500).json({ mensaje: 'Error al listar citas del cliente' });
  }
};


// ===================== getCitasPorRol ==========================================
const getCitasPorRol = async (req, res) => {
  const usuarioId = req.uid;
  const rol = req.rol;

  const { page = 1, limit = 10, fecha, estado } = req.query;
  const skip = (page - 1) * limit;

  try {
    let filtro = {};

    if (rol === 'admin') {
      // Admin ve todas las citas
    } else if (rol === 'barbero') {
      const peluquero = await Peluquero.findOne({ usuario: usuarioId });
      if (!peluquero) {
        return res.status(404).json({ mensaje: 'Peluquero no encontrado' });
      }
      filtro.peluquero = peluquero._id;
    } else {
      return res.status(403).json({ mensaje: 'No autorizado para ver citas' });
    }

    // Filtro adicional por fecha exacta (ISO)
    if (fecha) {
      const start = new Date(fecha);
      const end = new Date(fecha);
      end.setHours(23, 59, 59, 999);
      filtro.fecha = { $gte: start, $lte: end };
    }

    // Filtro por estado si se proporciona
    if (estado) {
      filtro.estado = estado;
    }

    const [total, citas] = await Promise.all([
      Cita.countDocuments(filtro),
      Cita.find(filtro)
        .populate({
          path: 'cliente',
          populate: { path: 'usuario', select: 'nombre correo foto' }
        })
        .populate({
          path: 'peluquero',
          populate: { path: 'usuario', select: 'nombre correo foto' }
        })
        .populate('servicios sede puestoTrabajo pago')
        .sort({ fecha: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
    ]);

    res.json({ total, page: Number(page), limit: Number(limit), citas });
  } catch (error) {
    console.error('❌ Error en getCitasPorRol:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas por rol' });
  }
};


// ===================== exports ================================
module.exports = {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  obtenerCitasDelCliente,
  obtenerCitasDelPeluquero,
  listarMisCitas,
  getCitasPorRol,
  finalizarCita
};
