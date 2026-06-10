// ===============================================
// CONTROLADOR DE SERVICIOS - Backend BarberShop
// ===============================================

const Servicio = require('../models/Servicio.model');
const { subirArchivoMinio, eliminarArchivoMinio } = require('../config/minio');
const Empresa = require('../models/Empresa.model');
const HistorialService = require('../services/historial.service');
const sharp = require('sharp');
const path = require('path');

// ============================================================
// Función utilitaria para procesar imágenes con marca de agua y subir a MinIO
// ============================================================
const procesarYSubirImagenesServicio = async (req) => {
  if (!req.files || req.files.length === 0) return [];

  const urlsSubidas = [];
  const empresaId = req.usuario?.empresaId;

  // 1. Intentar obtener el logo de la empresa como marca de agua
  let logoBuffer = null;
  if (empresaId) {
    try {
      const empresa = await Empresa.findById(empresaId);
      if (empresa && empresa.logo) {
        const logoUrl = empresa.logo;
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          const response = await fetch(logoUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            logoBuffer = Buffer.from(arrayBuffer);
          }
        } else if (logoUrl.startsWith('assets/')) {
          const fs = require('fs');
          let localPath = path.join(__dirname, '../..', logoUrl);
          if (!fs.existsSync(localPath)) {
            localPath = path.join(__dirname, '../../..', 'Frontend-BarberShop/src', logoUrl);
          }
          if (fs.existsSync(localPath)) {
            logoBuffer = fs.readFileSync(localPath);
          }
        }
      }
    } catch (logoError) {
      console.error('⚠️ Error al cargar el logo de la empresa para marca de agua:', logoError);
    }
  }

  // 2. Procesar cada archivo en memoria
  for (const file of req.files) {
    try {
      let bufferFinal = file.buffer;

      // Aplicar marca de agua si el logo se cargó exitosamente
      if (logoBuffer) {
        try {
          const baseImage = sharp(file.buffer);
          const metadata = await baseImage.metadata();

          if (metadata.width && metadata.height) {
            // El logo ocupará el 16% del ancho de la imagen
            const logoWidth = Math.round(metadata.width * 0.16);
            
            const resizedLogo = await sharp(logoBuffer)
              .resize({ width: logoWidth })
              .toBuffer();

            // Margen proporcional del 3%
            const margin = Math.round(metadata.width * 0.03);

            // Coordenadas para esquina superior izquierda
            const left = margin;
            const top = margin;

            if (left > 0 && top > 0) {
              bufferFinal = await baseImage
                .composite([{
                  input: resizedLogo,
                  top: top,
                  left: left,
                  blend: 'over'
                }])
                .toBuffer();
            }
          }
        } catch (watermarkError) {
          console.error('❌ Error aplicando marca de agua con sharp:', watermarkError);
          // Si falla, se sube la imagen original sin marca de agua
        }
      }

      // 3. Subir a MinIO
      const ext = path.extname(file.originalname);
      const uniqueName = `servicios/${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const url = await subirArchivoMinio(bufferFinal, uniqueName, file.mimetype);
      urlsSubidas.push(url);

    } catch (uploadError) {
      console.error('❌ Error al subir imagen de servicio:', uploadError);
    }
  }

  return urlsSubidas;
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
    const imagenes = await procesarYSubirImagenesServicio(req);

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

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'CREAR',
      modulo: 'SERVICIOS',
      descripcion: `Creó el servicio: ${nombre}`,
      entidadId: servicioGuardado._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

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

    const nuevasImagenes = await procesarYSubirImagenesServicio(req);

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

    servicioExistente.nombre = nombre?.trim() || servicioExistente.nombre;
    servicioExistente.descripcion = descripcion?.trim() || servicioExistente.descripcion;
    servicioExistente.precio = precio ?? servicioExistente.precio;
    servicioExistente.duracion = duracion ?? servicioExistente.duracion;
    servicioExistente.estado = estado ?? servicioExistente.estado;
    servicioExistente.imagenes = imagenesActualizadas;
    servicioExistente.asignadoA = rolesAsignados;

    const servicioActualizado = await servicioExistente.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'SERVICIOS',
      descripcion: `Actualizó el servicio: ${servicioActualizado.nombre}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

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

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'SERVICIOS',
      descripcion: `Cambió estado del servicio: ${servicio.nombre} a ${estado ? 'Activo' : 'Inactivo'}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

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


