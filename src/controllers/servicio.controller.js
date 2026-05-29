// ===============================================
// CONTROLADOR DE SERVICIOS - Backend BarberShop
// ===============================================

const Servicio = require('../models/Servicio.model');
const { subirArchivoMinio, eliminarArchivoMinio } = require('../config/minio');
const Empresa = require('../models/Empresa.model');
const sharp = require('sharp');
const path = require('path');

// ============================================================
// Función utilitaria para procesar imágenes con marca de agua y subir a MinIO
// ============================================================
const procesarYSubirImagenesServicio = async (req) => {
  console.log('🧪 [Watermark] Iniciando procesarYSubirImagenesServicio');
  console.log('🧪 [Watermark] req.files recibidos:', req.files ? req.files.length : 0);
  
  if (!req.files || req.files.length === 0) return [];

  const urlsSubidas = [];
  // Asegurar que obtenemos el empresaId, que podría estar en req.usuario o directamente en el token parsed
  const empresaId = req.usuario?.empresaId;
  console.log('🧪 [Watermark] empresaId de req.usuario:', empresaId);

  // 1. Intentar obtener el logo de la empresa como marca de agua
  let logoBuffer = null;
  if (empresaId) {
    try {
      const empresa = await Empresa.findById(empresaId);
      console.log('🧪 [Watermark] Empresa encontrada en BD:', empresa ? empresa.nombre : 'No encontrada');
      if (empresa && empresa.logo) {
        const logoUrl = empresa.logo;
        console.log('🧪 [Watermark] Logo URL de la empresa:', logoUrl);
        if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
          console.log('🧪 [Watermark] Descargando logo remoto:', logoUrl);
          const response = await fetch(logoUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            logoBuffer = Buffer.from(arrayBuffer);
            console.log('🧪 [Watermark] Logo remoto descargado con éxito. Tamaño:', logoBuffer.length, 'bytes');
          } else {
            console.error('🧪 [Watermark] Error descargando logo remoto:', response.statusText);
          }
        } else if (logoUrl.startsWith('assets/')) {
          const fs = require('fs');
          let localPath = path.join(__dirname, '../..', logoUrl);
          console.log('🧪 [Watermark] Buscando logo local en backend:', localPath);
          if (!fs.existsSync(localPath)) {
            localPath = path.join(__dirname, '../../..', 'Frontend-BarberShop/src', logoUrl);
            console.log('🧪 [Watermark] Logo local backend no existe, buscando en frontend:', localPath);
          }
          if (fs.existsSync(localPath)) {
            logoBuffer = fs.readFileSync(localPath);
            console.log('🧪 [Watermark] Logo local cargado con éxito. Tamaño:', logoBuffer.length, 'bytes');
          } else {
            console.warn('🧪 [Watermark] Logo local no se encontró en ninguna de las rutas');
          }
        }
      } else {
        console.log('🧪 [Watermark] La empresa no tiene ningún logo definido en la BD');
      }
    } catch (logoError) {
      console.error('⚠️ [Watermark] Error al cargar el logo de la empresa:', logoError);
    }
  } else {
    console.log('🧪 [Watermark] Omitiendo marca de agua: empresaId es nulo o indefinido (SuperAdmin o sin empresa)');
  }

  // 2. Procesar cada archivo en memoria
  for (const file of req.files) {
    try {
      let bufferFinal = file.buffer;

      // Aplicar marca de agua si el logo se cargó exitosamente
      if (logoBuffer) {
        try {
          console.log('🧪 [Watermark] Aplicando marca de agua al archivo:', file.originalname);
          const baseImage = sharp(file.buffer);
          const metadata = await baseImage.metadata();
          console.log('🧪 [Watermark] Dimensiones imagen base:', metadata.width, 'x', metadata.height);

          if (metadata.width && metadata.height) {
            // El logo ocupará el 16% del ancho de la imagen
            const logoWidth = Math.round(metadata.width * 0.16);
            console.log('🧪 [Watermark] Redimensionando logo a ancho:', logoWidth);
            
            const resizedLogo = await sharp(logoBuffer)
              .resize({ width: logoWidth })
              .toBuffer();

            const logoMetadata = await sharp(resizedLogo).metadata();
            const lWidth = logoMetadata.width || logoWidth;
            const lHeight = logoMetadata.height || logoWidth;

            // Margen proporcional del 3%
            const margin = Math.round(metadata.width * 0.03);

            // Coordenadas para esquina inferior derecha
            const left = metadata.width - lWidth - margin;
            const top = metadata.height - lHeight - margin;
            console.log('🧪 [Watermark] Coordenadas calculadas -> left:', left, 'top:', top, 'margin:', margin);

            if (left > 0 && top > 0) {
              bufferFinal = await baseImage
                .composite([{
                  input: resizedLogo,
                  top: top,
                  left: left,
                  blend: 'over'
                }])
                .toBuffer();
              console.log('🧪 [Watermark] Marca de agua estampada con éxito con sharp');
            } else {
              console.warn('🧪 [Watermark] Coordenadas inválidas (la imagen base es muy pequeña para el logo)');
            }
          }
        } catch (watermarkError) {
          console.error('❌ [Watermark] Error aplicando marca de agua con sharp:', watermarkError);
          // Si falla, se sube la imagen original sin marca de agua
        }
      } else {
        console.log('🧪 [Watermark] Omitiendo sharp: logoBuffer es nulo');
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


