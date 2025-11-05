// ===============================================
// CONTROLADOR DE SERVICIOS - Backend BarberShop
// ===============================================

const fs = require('fs');
const path = require('path');
const Servicio = require('../models/Servicio.model');

// ============================================================
// Función utilitaria para obtener rutas de imágenes subidas
// ============================================================
const obtenerRutasDeImagenes = (req) => {
  if (!req.files || req.files.length === 0) return [];

  // Retorna solo la ruta relativa, sin incluir http://localhost:3000
  return req.files.map((file) => `/uploads/servicios/${file.filename}`);
};


// ============================================================
// Crear un nuevo servicio
// ============================================================
exports.crearServicio = async (req, res) => {
  try {
    const { nombre, precio, duracion, estado, descripcion } = req.body;

    // ✅ Validación básica
    if (!nombre?.trim() || !precio) {
      return res.status(400).json({
        mensaje: '❌ El nombre y el precio son obligatorios',
      });
    }

    // ✅ Procesar imágenes con multer
    const imagenes = obtenerRutasDeImagenes(req);

    // ✅ Crear y guardar el nuevo servicio
    const nuevoServicio = new Servicio({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      precio,
      duracion,
      imagenes,
      estado: estado ?? true,
    });

    const servicioGuardado = await nuevoServicio.save();

    // ✅ Respuesta uniforme
    return res.status(201).json({
      mensaje: '✅ Servicio creado exitosamente',
      data: servicioGuardado,
    });
  } catch (error) {
    console.error('❌ [crearServicio] Error:', error);

    return res.status(500).json({
      mensaje: '❌ Error al crear el servicio',
      error: error.message,
    });
  }
};

// ============================================================
// Obtener todos los servicios
// ============================================================
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

// ============================================================
// Obtener servicio por ID
// ============================================================
exports.obtenerServicioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const servicio = await Servicio.findById(id);

    if (!servicio) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    res.status(200).json({
      total: 1,
      data: [servicio]
    });
  } catch (error) {
    console.error('[obtenerServicioPorId] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al obtener servicio',
      error: error.message
    });
  }
};

// ============================================================
// Actualizar servicio (✅reemplaza imágenes)
// ============================================================
exports.actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, precio, duracion, estado, descripcion, imagenesExistentes = [] } = req.body;

    // 🔍 Verificar si el servicio existe
    const servicioExistente = await Servicio.findById(id);
    if (!servicioExistente) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    // ✅ Obtener nuevas imágenes subidas (si existen)
    const nuevasImagenes = obtenerRutasDeImagenes(req);

    // Buscar imágenes eliminadas (las que estaban antes y ya no están)
    const imagenesEliminadas = servicioExistente.imagenes.filter(
      (img) => !imagenesExistentes.includes(img)
    );

    // 🗑️ Eliminar físicamente las imágenes descartadas
    for (const imgUrl of imagenesEliminadas) {
      const relativePath = imgUrl.split('/uploads/')[1]; // obtiene solo la parte después de /uploads/
      const rutaCompleta = path.join(__dirname, `../uploads/${relativePath}`);
      if (fs.existsSync(rutaCompleta)) fs.unlinkSync(rutaCompleta);
    }


    // ✅ Combinar las imágenes existentes + las nuevas
    const imagenesActualizadas = [...imagenesExistentes, ...nuevasImagenes];

    // ============================================================
    // 💾 Actualizar el servicio
    // ============================================================
    servicioExistente.nombre = nombre?.trim() || servicioExistente.nombre;
    servicioExistente.descripcion = descripcion?.trim() || servicioExistente.descripcion;
    servicioExistente.precio = precio ?? servicioExistente.precio;
    servicioExistente.duracion = duracion ?? servicioExistente.duracion;
    servicioExistente.estado = estado ?? servicioExistente.estado;
    servicioExistente.imagenes = imagenesActualizadas;

    const servicioActualizado = await servicioExistente.save();

    res.status(200).json({
      mensaje: '✅ Servicio actualizado exitosamente',
      data: servicioActualizado,
    });
  } catch (error) {
    console.error('❌ [actualizarServicio] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al actualizar servicio',
      error: error.message,
    });
  }
};


// ============================================================
// Cambiar estado (activar/desactivar servicio)
// ============================================================
exports.cambiarEstadoServicio = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!id) {
      return res.status(400).json({ mensaje: '❌ ID de servicio no proporcionado' });
    }

    const servicio = await Servicio.findById(id);
    if (!servicio) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    servicio.estado = estado;
    await servicio.save();

    res.status(200).json({
      mensaje: `✅ Servicio ${estado ? 'activado' : 'desactivado'} correctamente`,
      servicio
    });
  } catch (error) {
    console.error('[cambiarEstadoServicio] Error:', error);
    res.status(500).json({
      mensaje: '❌ Error al cambiar el estado del servicio',
      error: error.message
    });
  }
};


