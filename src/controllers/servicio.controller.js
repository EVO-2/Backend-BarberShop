// ===============================================
// CONTROLADOR DE SERVICIOS - Backend BarberShop
// ===============================================

const Servicio = require('../models/Servicio.model');
const { eliminarArchivoMinio } = require('../config/minio');

// ============================================================
// Función utilitaria para obtener rutas de imágenes subidas
// ============================================================
const obtenerRutasDeImagenes = (req) => {
  if (!req.files || req.files.length === 0) return [];

  // Con MinIO multerS3 nos proporciona directamente el URL público en file.location
  return req.files.map((file) => file.location);
};


// ============================================================
// Crear un nuevo servicio
// ============================================================
exports.crearServicio = async (req, res) => {
  try {
    const { nombre, precio, duracion, estado, descripcion, asignadoA } = req.body;

    // ✅ Validación básica
    if (!nombre?.trim() || !precio) {
      return res.status(400).json({
        mensaje: '❌ El nombre y el precio son obligatorios',
      });
    }

    // ✅ Procesar imágenes con multer
    const imagenes = obtenerRutasDeImagenes(req);

    let rolesAsignados = ['barbero'];
    if (asignadoA) {
      if (Array.isArray(asignadoA)) rolesAsignados = asignadoA;
      else if (typeof asignadoA === 'string') {
        try { rolesAsignados = JSON.parse(asignadoA); } catch (e) { rolesAsignados = [asignadoA]; }
      }
    }

    // ✅ Crear y guardar el nuevo servicio
    const nuevoServicio = new Servicio({
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || '',
      precio,
      duracion,
      imagenes,
      estado: estado ?? true,
      asignadoA: rolesAsignados,
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
    const {
      nombre,
      precio,
      duracion,
      estado,
      descripcion,
      asignadoA,
      imagenesExistentes = []
    } = req.body;

    const servicioExistente = await Servicio.findById(id);
    if (!servicioExistente) {
      return res.status(404).json({ mensaje: '❌ Servicio no encontrado' });
    }

    const nuevasImagenes = obtenerRutasDeImagenes(req);

    const imagenesEliminadas = servicioExistente.imagenes.filter(
      (img) => !imagenesExistentes.includes(img)
    );

    // ✅ Eliminación en la nube
    for (const imgUrl of imagenesEliminadas) {
      eliminarArchivoMinio(imgUrl);
    }

    const imagenesActualizadas = [...imagenesExistentes, ...nuevasImagenes];

    let rolesAsignados = servicioExistente.asignadoA;

    if (asignadoA) {

      if (Array.isArray(asignadoA)) {
        rolesAsignados = asignadoA;

      } else if (typeof asignadoA === 'string') {

        try {
          const parsed = JSON.parse(asignadoA);

          rolesAsignados = Array.isArray(parsed)
            ? parsed
            : [parsed];

        } catch (e) {
          rolesAsignados = [asignadoA];
        }

      }

      rolesAsignados = rolesAsignados
        .map(r => String(r)
          .replace(/[\[\]"]/g, '')
          .toLowerCase()
          .trim()
        )
        .filter(r => r.length > 0);

    }

    // ✅ Normalizar roles
    rolesAsignados = rolesAsignados.map(r => r.toLowerCase().trim());

    console.log('🧪 Roles asignados:', rolesAsignados);

    servicioExistente.nombre = nombre?.trim() || servicioExistente.nombre;
    servicioExistente.descripcion = descripcion?.trim() || servicioExistente.descripcion;
    servicioExistente.precio = precio ?? servicioExistente.precio;
    servicioExistente.duracion = duracion ?? servicioExistente.duracion;
    servicioExistente.estado = estado ?? servicioExistente.estado;
    servicioExistente.imagenes = imagenesActualizadas;
    servicioExistente.asignadoA = rolesAsignados;

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


