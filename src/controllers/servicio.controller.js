const Servicio = require('../models/Servicio.model');

// ===============================
// Crear un nuevo servicio
// ===============================
exports.crearServicio = async (req, res) => {
  try {
    const { nombre, precio, duracion, imagenes, estado } = req.body;

    const nuevoServicio = new Servicio({
      nombre,
      precio,
      duracion,
      imagenes: Array.isArray(imagenes) ? imagenes : [], // array de URLs o paths
      estado
    });

    const servicioGuardado = await nuevoServicio.save();

    res.status(201).json({
      mensaje: '✅ Servicio creado exitosamente',
      data: servicioGuardado
    });
  } catch (error) {
    console.error('[crearServicio] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al crear el servicio',
      error: error.message
    });
  }
};

// ===============================
// Obtener todos los servicios
// ===============================
exports.obtenerServicios = async (req, res) => {
  try {
    const servicios = await Servicio.find().sort({ createdAt: -1 });

    res.status(200).json({
      total: servicios.length,
      data: servicios
    });
  } catch (error) {
    console.error('[obtenerServicios] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al obtener servicios',
      error: error.message
    });
  }
};

// ===============================
// Obtener servicio por ID
// ===============================
exports.obtenerServicioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const servicio = await Servicio.findById(id);

    if (!servicio) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    res.status(200).json({
      total: 1,
      data: [servicio] // se devuelve como array para consistencia con obtenerServicios
    });
  } catch (error) {
    console.error('[obtenerServicioPorId] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al obtener servicio',
      error: error.message
    });
  }
};

// ===============================
// Actualizar servicio
// ===============================
exports.actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, duracion, imagenes, estado } = req.body;

    const servicioActualizado = await Servicio.findByIdAndUpdate(
      id,
      { nombre, precio, duracion, imagenes, estado },
      { new: true, runValidators: true }
    );

    if (!servicioActualizado) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    res.status(200).json({
      mensaje: '✅ Servicio actualizado exitosamente',
      data: servicioActualizado
    });
  } catch (error) {
    console.error('[actualizarServicio] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al actualizar servicio',
      error: error.message
    });
  }
};

// ===============================
// Eliminar servicio
// ===============================
exports.eliminarServicio = async (req, res) => {
  try {
    const { id } = req.params;

    const servicioEliminado = await Servicio.findByIdAndDelete(id);

    if (!servicioEliminado) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    res.status(200).json({
      mensaje: '✅ Servicio eliminado correctamente',
      data: servicioEliminado
    });
  } catch (error) {
    console.error('[eliminarServicio] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al eliminar servicio',
      error: error.message
    });
  }
};
