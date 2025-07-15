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
    console.log('📩 [crearCita] Body recibido:', req.body);
    console.log('👤 [crearCita] Usuario autenticado:', req.usuario);

    try {
      const rolUsuario = req.rol;
      const uidUsuario = req.uid;

      const {
        cliente: clienteDesdeBody,
        peluquero,
        servicios,
        sede,
        puestoTrabajo,
        fecha,
        observaciones
      } = req.body;

      // 0️⃣ Validar campos requeridos
      if (!peluquero || !servicios?.length || !sede || !puestoTrabajo || !fecha) {
        return res.status(400).json({ mensaje: 'Todos los campos obligatorios deben ser enviados' });
      }

      // 1️⃣ Validar que la fecha no sea pasada
      const fechaCita = new Date(fecha);
      const ahora = new Date();
      if (isNaN(fechaCita.getTime())) {
        return res.status(400).json({ mensaje: 'Fecha inválida' });
      }
      if (fechaCita < ahora) {
        return res.status(400).json({ mensaje: 'No se puede reservar citas en el pasado' });
      }

      // 2️⃣ Verificar rol
      if (!['cliente', 'admin'].includes(rolUsuario)) {
        return res.status(403).json({ mensaje: 'Solo clientes o administradores pueden reservar citas' });
      }

      // 3️⃣ Determinar cliente
      let clienteDoc;
      if (rolUsuario === 'admin') {
        clienteDoc = await Cliente.findOne({ _id: clienteDesdeBody, estado: true });
      } else {
        clienteDoc = await Cliente.findOne({ usuario: uidUsuario, estado: true });
      }

      if (!clienteDoc) {
        return res.status(400).json({ mensaje: 'Cliente no válido o inactivo' });
      }

      // 4️⃣ Validaciones de referencias
      const [peluqueroExiste, sedeExiste, puestoExiste] = await Promise.all([
        Peluquero.exists({ _id: peluquero, estado: true }),
        Sede.exists({ _id: sede, estado: true }),
        PuestoTrabajo.exists({ _id: puestoTrabajo, estado: true })
      ]);

      if (!peluqueroExiste) return res.status(400).json({ mensaje: 'Peluquero no válido o inactivo' });
      if (!sedeExiste) return res.status(400).json({ mensaje: 'Sede no válida o inactiva' });
      if (!puestoExiste) return res.status(400).json({ mensaje: 'Puesto de trabajo no válido o inactivo' });

      // 5️⃣ Validar servicios
      const serviciosValidos = await Servicio.find({ _id: { $in: servicios }, estado: true });
      if (serviciosValidos.length !== servicios.length) {
        return res.status(400).json({ mensaje: 'Uno o más servicios no existen o están inactivos' });
      }

      // 6️⃣ Calcular turno del día
      const inicioDelDia = new Date(fechaCita);
      inicioDelDia.setHours(0, 0, 0, 0);
      const finDelDia = new Date(fechaCita);
      finDelDia.setHours(23, 59, 59, 999);

      const citasDelDia = await Cita.countDocuments({
        peluquero,
        fecha: { $gte: inicioDelDia, $lte: finDelDia }
      });
      const nuevoTurno = citasDelDia + 1;

      // 7️⃣ Guardar cita
      console.log('📝 Intentando guardar cita con datos:', {
        cliente: clienteDoc._id,
        peluquero,
        servicios,
        sede,
        puestoTrabajo,
        fecha,
        turno: nuevoTurno,
        observaciones
      });

      const nuevaCita = await Cita.create({
        cliente: clienteDoc._id,
        peluquero,
        servicios,
        sede,
        puestoTrabajo,
        fecha,
        turno: nuevoTurno,
        observaciones
      });

      console.log('✅ Cita guardada:', nuevaCita._id);
      res.status(201).json(nuevaCita);

    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          mensaje: 'Conflicto de agenda: ya existe una cita con ese peluquero o puesto en ese turno'
        });
      }
      console.error('❌ Error al crear cita:', error);
      res.status(500).json({ mensaje: 'Error al reservar la cita', error: error.message });
    }
  };


// ===================== obtener todas las citas ===========================
const obtenerCitas = async (_req, res) => {
  try {
    const citas = await Cita.find()
      .populate('cliente',    'usuario')
      .populate('peluquero',  'usuario')
      .populate('servicios')
      .populate('sede')
      .populate('puestoTrabajo')
      .populate('pago');
    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas' });
  }
};

// ===================== obtener una cita por ID ===========================
const obtenerCitaPorId = async (req, res) => {
  try {
    const cita = await Cita.findById(req.params.id)
      .populate('cliente')
      .populate('peluquero')
      .populate('servicios')
      .populate('sede')
      .populate('puestoTrabajo')
      .populate('pago');

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
      const serviciosValidos = await Servicio.find({
        _id: { $in: servicios },
        estado: true
      });
      if (serviciosValidos.length !== servicios.length)
        return res.status(400).json({ mensaje: 'Uno o más servicios no existen o están inactivos' });
    }

    if (sede && !(await Sede.exists({ _id: sede, estado: true })))
      return res.status(400).json({ mensaje: 'Sede no válida o inactiva' });

    if (puestoTrabajo && !(await PuestoTrabajo.exists({ _id: puestoTrabajo, estado: true })))
      return res.status(400).json({ mensaje: 'Puesto de trabajo no válido o inactivo' });

    const citaActualizada = await Cita.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!citaActualizada)
      return res.status(404).json({ mensaje: 'Cita no encontrada' });

    res.json(citaActualizada);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        mensaje: 'Conflicto de agenda: ya existe una cita con esos datos'
      });
    }
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
    );

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
    const citas = await Cita.find({ cliente: req.uid })
      .populate('peluquero', 'usuario')
      .populate('servicios')
      .populate('sede')
      .populate('puestoTrabajo')
      .populate('pago');
    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas del cliente:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del cliente' });
  }
};

// ===================== citas del peluquero logueado ======================
const obtenerCitasDelPeluquero = async (req, res) => {
  try {
    const citas = await Cita.find({ peluquero: req.uid })
      .populate('cliente', 'usuario')
      .populate('servicios')
      .populate('sede')
      .populate('puestoTrabajo')
      .populate('pago');
    res.json(citas);
  } catch (error) {
    console.error('❌ Error al obtener citas del peluquero:', error);
    res.status(500).json({ mensaje: 'Error al obtener citas del peluquero' });
  }
};

// ===================== exports ==========================================
module.exports = {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  actualizarCita,
  cancelarCita,
  obtenerCitasDelCliente,
  obtenerCitasDelPeluquero
};
