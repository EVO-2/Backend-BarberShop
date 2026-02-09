// controllers/equipo.controller.js
const Equipo = require('../models/Equipo.model');
const EquipoMovimiento = require('../models/EquipoMovimiento.model');

// Crear equipo
const crearEquipo = async (req, res) => {
  try {
    const data = req.body;
    // opcional: asignar creadoPor desde req.uid si tu auth middleware lo setea
    if (req.uid) data.creadoPor = req.uid;
    const equipo = await Equipo.create(data);

    // Crear movimiento de alta
    await EquipoMovimiento.create({
      equipo: equipo._id,
      tipo: 'alta',
      toSede: equipo.sede || null,
      toPuesto: equipo.puesto || null,
      descripcion: 'Alta de equipo',
      creadoPor: req.uid || null
    });

    res.status(201).json({ data: equipo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: err.message || 'Error creando equipo' });
  }
};

// Listar equipos (filtros sencillos)
const listarEquipos = async (req, res) => {
  try {
    const { tipo, sede, estado, q, page = 1, limit = 20 } = req.query;
    const filtro = { activo: true };
    if (tipo) filtro.tipo = tipo;
    if (sede) filtro.sede = sede;
    if (estado) filtro.estado = estado;
    if (q) filtro.nombre = new RegExp(q, 'i');

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const items = await Equipo.find(filtro)
      .populate('sede', 'nombre direccion')
      .populate('puesto', 'nombre')
      .populate('asignadoA', 'nombre correo')
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await Equipo.countDocuments(filtro);
    res.json({ data: items, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error listando equipos' });
  }
};

// Obtener por id (detalle)
const obtenerEquipoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const equipo = await Equipo.findById(id)
      .populate('sede', 'nombre direccion')
      .populate('puesto', 'nombre')
      .populate('asignadoA', 'nombre correo')
      .lean();
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });
    res.json({ data: equipo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener equipo' });
  }
};

// Actualizar equipo
const actualizarEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (req.uid) data.actualizadoPor = req.uid;

    // Si cambia sede/puesto/asignadoA, registrar movimiento (opcional más abajo)
    const equipoPrev = await Equipo.findById(id).lean();
    if (!equipoPrev) return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    const equipo = await Equipo.findByIdAndUpdate(id, data, { new: true, runValidators: true });

    // Registrar movimiento si hubo cambio de sede/puesto/asignadoA/estado importante
    const movimientos = [];
    if (data.sede && String(data.sede) !== String(equipoPrev.sede)) {
      movimientos.push({
        equipo: id,
        tipo: 'traspaso',
        fromSede: equipoPrev.sede || null,
        toSede: data.sede,
        descripcion: `Traspaso sede ${equipoPrev.sede || '→'} → ${data.sede}`,
        creadoPor: req.uid || null
      });
    }
    if (data.puesto && String(data.puesto) !== String(equipoPrev.puesto)) {
      movimientos.push({
        equipo: id,
        tipo: 'traspaso',
        fromPuesto: equipoPrev.puesto || null,
        toPuesto: data.puesto,
        descripcion: `Traspaso puesto`,
        creadoPor: req.uid || null
      });
    }
    if (data.asignadoA && String(data.asignadoA) !== String(equipoPrev.asignadoA)) {
      movimientos.push({
        equipo: id,
        tipo: 'prestamo',
        responsable: data.asignadoA,
        descripcion: `Asignado a usuario ${data.asignadoA}`,
        creadoPor: req.uid || null
      });
    }
    if (movimientos.length > 0) await EquipoMovimiento.insertMany(movimientos);

    res.json({ data: equipo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar equipo' });
  }
};

// Baja lógica
const eliminarEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const equipo = await Equipo.findByIdAndUpdate(id, { activo: false }, { new: true });
    if (!equipo) return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    await EquipoMovimiento.create({
      equipo: id,
      tipo: 'baja',
      descripcion: 'Baja lógica del equipo',
      creadoPor: req.uid || null
    });

    res.json({ mensaje: 'Equipo dado de baja correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al eliminar equipo' });
  }
};

module.exports = {
  crearEquipo,
  listarEquipos,
  obtenerEquipoPorId,
  actualizarEquipo,
  eliminarEquipo
};
