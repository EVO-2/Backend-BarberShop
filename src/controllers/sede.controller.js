const Sede = require('../models/Sede.model');
const HistorialService = require('../services/historial.service');

// GET
exports.obtenerSedes = async (req, res) => {
  try {
    const sedes = await Sede.find().sort({ nombre: 1 });
    res.json(sedes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener sedes' });
  }
};

// POST
exports.crearSede = async (req, res) => {
  try {
    const empresaId = req.usuario?.empresaId;
    if (empresaId) {
      const planService = require('../services/plan.service');
      try {
        await planService.verificarLimiteSucursales(empresaId);
      } catch (limiteError) {
        return res.status(403).json({ mensaje: limiteError.message });
      }
    }

    const { nombre, direccion, telefono, estado } = req.body;

    const nuevaSede = new Sede({
      empresa: empresaId,
      nombre,
      direccion,
      telefono,
      estado: estado ?? true
    });

    await nuevaSede.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'CREAR',
      modulo: 'SEDES',
      descripcion: `Creó la sede: ${nombre}`,
      entidadId: nuevaSede._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(201).json(nuevaSede);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear sede' });
  }
};

// PUT
exports.actualizarSede = async (req, res) => {
  try {
    const { id } = req.params;

    const sede = await Sede.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (sede) {
      // Registrar acción en auditoría
      HistorialService.registrarAccion({
        usuario: req.usuario._id,
        accion: 'ACTUALIZAR',
        modulo: 'SEDES',
        descripcion: `Actualizó la sede: ${sede.nombre}`,
        entidadId: id,
        ip: req.ip || req.connection.remoteAddress,
        dispositivo: req.headers['user-agent']
      });
    }

    res.json(sede);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar sede' });
  }
};

// PATCH
exports.cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const sede = await Sede.findByIdAndUpdate(
      id,
      { estado },
      { new: true }
    );

    if (sede) {
      // Registrar acción en auditoría
      HistorialService.registrarAccion({
        usuario: req.usuario._id,
        accion: 'ACTUALIZAR',
        modulo: 'SEDES',
        descripcion: `Cambió estado de la sede: ${sede.nombre} a ${estado ? 'Activo' : 'Inactivo'}`,
        entidadId: id,
        ip: req.ip || req.connection.remoteAddress,
        dispositivo: req.headers['user-agent']
      });
    }

    res.json(sede);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar estado' });
  }
};