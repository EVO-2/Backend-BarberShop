const Equipo = require('../models/Equipo.model');
const EquipoMovimiento = require('../models/EquipoMovimiento.model');

// ======================================
// CREAR EQUIPO
// ======================================
const crearEquipo = async (req, res) => {
  try {
    const data = req.body;

    if (req.uid) data.creadoPor = req.uid;

    const equipoCreado = await Equipo.create(data);

    await EquipoMovimiento.create({
      equipo: equipoCreado._id,
      tipo: 'alta',
      toSede: equipoCreado.sede || null,
      toPuesto: equipoCreado.puesto || null,
      descripcion: 'Alta de equipo',
      creadoPor: req.uid || null
    });

    const equipo = await Equipo.findById(equipoCreado._id)
      .populate('sede', 'nombre direccion')
      .populate({
        path: 'puesto',
        select: 'nombre peluquero',
        populate: {
          path: 'peluquero',
          select: 'usuario',
          populate: {
            path: 'usuario',
            select: 'nombre correo'
          }
        }
      })
      .lean();

    res.status(201).json({ data: equipo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: err.message || 'Error creando equipo' });
  }
};

// ======================================
// LISTAR EQUIPOS
// ======================================
const listarEquipos = async (req, res) => {
  try {
    const { tipo, sede, estado, q, page = 1, limit = 20, activo } = req.query;

    const filtro = {};

    if (activo === 'true') filtro.activo = true;
    else if (activo === 'false') filtro.activo = false;

    if (tipo) filtro.tipo = tipo;
    if (sede) filtro.sede = sede;
    if (estado) filtro.estado = estado;
    if (q) filtro.nombre = new RegExp(q, 'i');

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const items = await Equipo.find(filtro)
      .populate('sede', 'nombre direccion')
      .populate({
        path: 'puesto',
        select: 'nombre peluquero',
        populate: {
          path: 'peluquero',
          select: 'usuario',
          populate: {
            path: 'usuario',
            select: 'nombre correo'
          }
        }
      })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await Equipo.countDocuments(filtro);

    res.json({
      data: items,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error listando equipos' });
  }
};

// ======================================
// OBTENER POR ID
// ======================================
const obtenerEquipoPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const equipo = await Equipo.findById(id)
      .populate('sede', 'nombre direccion')
      .populate({
        path: 'puesto',
        select: 'nombre peluquero',
        populate: {
          path: 'peluquero',
          select: 'usuario',
          populate: {
            path: 'usuario',
            select: 'nombre correo'
          }
        }
      })
      .lean();

    if (!equipo)
      return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    res.json({ data: equipo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al obtener equipo' });
  }
};

// ======================================
// ACTUALIZAR EQUIPO
// ======================================
const actualizarEquipo = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    if (req.uid) data.actualizadoPor = req.uid;

    const equipoPrev = await Equipo.findById(id).lean();
    if (!equipoPrev)
      return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    await Equipo.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    const movimientos = [];

    if (data.sede && String(data.sede) !== String(equipoPrev.sede)) {
      movimientos.push({
        equipo: id,
        tipo: 'traspaso',
        fromSede: equipoPrev.sede || null,
        toSede: data.sede,
        descripcion: 'Cambio de sede',
        creadoPor: req.uid || null
      });
    }

    if (data.puesto && String(data.puesto) !== String(equipoPrev.puesto)) {
      movimientos.push({
        equipo: id,
        tipo: 'traspaso',
        fromPuesto: equipoPrev.puesto || null,
        toPuesto: data.puesto,
        descripcion: 'Cambio de puesto',
        creadoPor: req.uid || null
      });
    }

    if (movimientos.length > 0)
      await EquipoMovimiento.insertMany(movimientos);

    const equipo = await Equipo.findById(id)
      .populate('sede', 'nombre direccion')
      .populate({
        path: 'puesto',
        select: 'nombre peluquero',
        populate: {
          path: 'peluquero',
          select: 'usuario',
          populate: {
            path: 'usuario',
            select: 'nombre correo'
          }
        }
      })
      .lean();

    res.json({ data: equipo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al actualizar equipo' });
  }
};

// ======================================
// CAMBIAR ESTADO
// ======================================
const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean')
      return res.status(400).json({ mensaje: 'El estado activo es requerido' });

    const nuevoEstado = activo ? 'activo' : 'retirado';

    await Equipo.findByIdAndUpdate(
      id,
      {
        activo,
        estado: nuevoEstado
      },
      { new: true, runValidators: true }
    );

    await EquipoMovimiento.create({
      equipo: id,
      tipo: activo ? 'alta' : 'baja',
      descripcion: activo
        ? 'Reactivación del equipo'
        : 'Baja lógica del equipo (estado cambiado a retirado)',
      creadoPor: req.uid || null
    });

    const equipo = await Equipo.findById(id)
      .populate('sede', 'nombre direccion')
      .populate({
        path: 'puesto',
        select: 'nombre peluquero',
        populate: {
          path: 'peluquero',
          select: 'usuario',
          populate: {
            path: 'usuario',
            select: 'nombre correo'
          }
        }
      })
      .lean();

    if (!equipo)
      return res.status(404).json({ mensaje: 'Equipo no encontrado' });

    res.json({
      data: equipo,
      mensaje: activo
        ? 'Equipo activado correctamente'
        : 'Equipo desactivado correctamente'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error cambiando estado del equipo' });
  }
};

module.exports = {
  crearEquipo,
  listarEquipos,
  obtenerEquipoPorId,
  actualizarEquipo,
  cambiarEstado
};