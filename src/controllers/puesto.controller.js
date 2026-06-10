// controllers/puesto.controller.js
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');
const HistorialService = require('../services/historial.service');

// =================== OBTENER TODOS LOS PUESTOS ===================
const obtenerPuestos = async (req, res) => {
  try {
    const { sedeId } = req.params;
    const { usuario_id } = req.query;

    if (!sedeId) {
      return res.status(400).json({ msg: 'El parámetro sedeId es obligatorio.' });
    }

    // Buscar puestos y poblar peluquero → usuario(nombre, apellido)
    const puestos = await PuestoTrabajo.find({ sede: sedeId })
      .populate({
        path: 'peluquero',
        populate: {
          path: 'usuario',
          select: 'nombre apellido estado'
        }
      })
      .populate('sede', 'nombre');

    // Simplificar la respuesta al frontend
    const puestosSimplificados = puestos.map(p => ({
      _id: p._id,
      nombre: p.nombre,
      sede: p.sede?.nombre || 'Sin sede',
      estado: p.estado,
      peluquero: p.peluquero
        ? {
            _id: p.peluquero._id,
            nombreCompleto: `${p.peluquero.usuario?.nombre || ''} ${p.peluquero.usuario?.apellido || ''}`.trim()
          }
        : null
    }));

    return res.json(puestosSimplificados);
  } catch (error) {
    return res.status(500).json({ msg: 'Error al obtener los puestos.' });
  }
};

// =============================
// POST /api/puestos
// =============================
const crearPuesto = async (req, res) => {
  try {
    // 🧩 Aceptar tanto "sede" como "sedeId"
    const { nombre, estado = true } = req.body;
    const sedeId = req.body.sede || req.body.sedeId;

    // ✅ Validaciones
    if (!nombre || !sedeId) {
      return res.status(400).json({ message: 'Nombre y sede son obligatorios' });
    }

    // ✅ Crear el nuevo puesto
    const nuevoPuesto = new PuestoTrabajo({
      nombre,
      sede: sedeId,
      estado
    });

    await nuevoPuesto.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'CREAR',
      modulo: 'CONFIGURACION',
      descripcion: `Creó el puesto de trabajo: ${nombre}`,
      entidadId: nuevoPuesto._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.status(201).json({
      message: 'Puesto creado correctamente',
      puesto: nuevoPuesto
    });
  } catch (error) {
    console.error('❌ Error en crearPuesto:', error);
    return res.status(500).json({ message: 'Error al crear el puesto de trabajo' });
  }
};


// =============================
// PUT /api/puestos/:id
// =============================
  const actualizarPuesto = async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, estado, sede } = req.body; // ✅ Incluimos sede

      const puesto = await PuestoTrabajo.findById(id);
      if (!puesto) {
        return res.status(404).json({ message: 'Puesto no encontrado' });
      }

      // ✅ Actualizar solo los campos enviados
      if (nombre) puesto.nombre = nombre;
      if (typeof estado === 'boolean') puesto.estado = estado;
      if (sede) puesto.sede = sede; // Puede venir como ObjectId o como string

      const puestoActualizado = await puesto.save();

      // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'CONFIGURACION',
      descripcion: `Actualizó el puesto de trabajo: ${puesto.nombre}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.json({
      message: 'Puesto actualizado correctamente',
      puesto: puestoActualizado,
    });
    } catch (error) {
      console.error('❌ Error en actualizarPuesto:', error);
      return res.status(500).json({
        message: 'Error al actualizar el puesto de trabajo',
        error: error.message,
      });
    }
  };


// =============================
// DELETE /api/puestos/:id (soft delete)
// =============================
const eliminarPuesto = async (req, res) => {
  try {
    const { id } = req.params;
    const puesto = await PuestoTrabajo.findById(id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    puesto.estado = false;
    await puesto.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ELIMINAR',
      modulo: 'CONFIGURACION',
      descripcion: `Eliminó el puesto de trabajo (soft delete): ${puesto.nombre}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.json({ message: 'Puesto eliminado correctamente (soft delete)', puesto });
  } catch (error) {
    return res.status(500).json({ message: 'Error al eliminar el puesto de trabajo' });
  }
};

// =============================
// PUT /api/puestos/:id/asignar
// =============================
const asignarPuesto = async (req, res) => {
  try {
    const { peluqueroId } = req.body;
    if (!peluqueroId)
      return res.status(400).json({ message: 'El ID del peluquero es obligatorio' });

    const puesto = await PuestoTrabajo.findById(req.params.id).populate('sede peluquero');
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    if (puesto.peluquero && puesto.peluquero._id.toString() !== peluqueroId)
      return res.status(400).json({ message: 'El puesto ya está ocupado por otro peluquero' });

    const peluquero = await Peluquero.findById(peluqueroId).populate('puestoTrabajo');
    if (!peluquero) return res.status(404).json({ message: 'Peluquero no encontrado' });

    const sedeActual = peluquero.puestoTrabajo?.sede?.toString();
    if (sedeActual && puesto.sede._id.toString() !== sedeActual)
      return res
        .status(400)
        .json({ message: 'El puesto seleccionado no pertenece a la misma sede del peluquero' });

    const puestoAnterior = peluquero.puestoTrabajo?._id?.toString();
    if (puestoAnterior && puestoAnterior !== puesto._id.toString()) {
      await PuestoTrabajo.findByIdAndUpdate(puestoAnterior, { peluquero: null });
    }

    puesto.peluquero = peluquero._id;
    await puesto.save();

    peluquero.puestoTrabajo = puesto._id;
    await peluquero.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'CONFIGURACION',
      descripcion: `Asignó al peluquero ID ${peluqueroId} al puesto de trabajo: ${puesto.nombre}`,
      entidadId: puesto._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.json({ message: 'Peluquero asignado correctamente', peluquero });
  } catch (error) {
    return res.status(500).json({ message: 'Error al asignar el puesto de trabajo' });
  }
};

// =============================
// PUT /api/puestos/:id/liberar
// =============================
const liberarPuesto = async (req, res) => {
  try {
    const puesto = await PuestoTrabajo.findById(req.params.id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    if (puesto.peluquero)
      await Peluquero.findByIdAndUpdate(puesto.peluquero, { puestoTrabajo: null });

    puesto.peluquero = null;
    await puesto.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'CONFIGURACION',
      descripcion: `Liberó el puesto de trabajo: ${puesto.nombre}`,
      entidadId: puesto._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    return res.json({ message: 'Puesto liberado exitosamente' });
  } catch (error) {
    return res.status(500).json({ message: 'Error al liberar el puesto de trabajo' });
  }
};

module.exports = {
  obtenerPuestos,
  crearPuesto,
  actualizarPuesto,
  eliminarPuesto,
  asignarPuesto,
  liberarPuesto
};
