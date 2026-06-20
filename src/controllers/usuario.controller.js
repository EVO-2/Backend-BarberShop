const Usuario = require('../models/Usuario.model');
const Cliente = require('../models/Cliente.model');
const Peluquero = require('../models/Peluquero.model');
const Rol = require('../models/Rol.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const HistorialService = require('../services/historial.service');

// ==========================
// Helper para actualizar puesto de peluquero
// ==========================
const actualizarPuestoPeluquero = async (peluquero, nuevoPuestoId, estado) => {
  const puestoAnteriorId = peluquero.puestoTrabajo ? peluquero.puestoTrabajo.toString() : null;

  // Si el peluquero se desactiva, liberar su puesto
  if (estado === false && peluquero.puestoTrabajo) {
    await PuestoTrabajo.findByIdAndUpdate(peluquero.puestoTrabajo, { peluquero: null });
    peluquero.puestoTrabajo = null;
  }

  // Si cambia de puesto y está activo
  if (nuevoPuestoId && nuevoPuestoId !== puestoAnteriorId && estado !== false) {
    // Validar que el puesto no esté ocupado por otro peluquero
    const puestoOcupado = await PuestoTrabajo.findOne({
      _id: nuevoPuestoId,
      peluquero: { $ne: peluquero._id }
    });
    if (puestoOcupado && puestoOcupado.peluquero) {
      throw new Error('El puesto seleccionado ya está ocupado por otro peluquero.');
    }

    // Liberar el puesto anterior
    if (puestoAnteriorId) {
      await PuestoTrabajo.findByIdAndUpdate(puestoAnteriorId, { peluquero: null });
    }

    // Asignar el nuevo puesto
    await PuestoTrabajo.findByIdAndUpdate(nuevoPuestoId, { peluquero: peluquero._id });
    peluquero.puestoTrabajo = nuevoPuestoId;
  }

  await peluquero.save();
};

// ==========================
//      Listar Usuarios
// ==========================
const listarUsuarios = async (req, res) => {
  try {
    // 🔥 MIGRACIÓN AUTOMÁTICA INFALIBLE 🔥
    // Usamos el driver nativo de MongoDB (.collection.updateMany) para asegurar que 
    // Mongoose y el tenantPlugin NO bloqueen la actualización.
    // Asignamos los usuarios huérfanos a la empresa del administrador que está haciendo la petición.
    
    if (req.usuario && req.usuario.empresaId) {
      // Forzar conversión a ObjectId para el driver nativo de MongoDB
      const empresaDestino = new mongoose.Types.ObjectId(req.usuario.empresaId.toString());
      
      const r1 = await Usuario.collection.updateMany(
        { $or: [{ empresaId: null }, { empresaId: { $exists: false } }] },
        { $set: { empresaId: empresaDestino } }
      );
      
      const r2 = await Cliente.collection.updateMany(
        { $or: [{ empresaId: null }, { empresaId: { $exists: false } }] },
        { $set: { empresaId: empresaDestino } }
      );
      
      const r3 = await Peluquero.collection.updateMany(
        { $or: [{ empresaId: null }, { empresaId: { $exists: false } }] },
        { $set: { empresaId: empresaDestino } }
      );

      if (r1.modifiedCount > 0 || r2.modifiedCount > 0 || r3.modifiedCount > 0) {
        console.log(`[MIGRACIÓN] Usuarios actualizados: ${r1.modifiedCount}, Clientes: ${r2.modifiedCount}, Peluqueros: ${r3.modifiedCount}`);
      }
    }

    const usuarios = await Usuario.find()
      .populate('rol', 'nombre')
      .populate({
        path: 'cliente',
        select: 'telefono direccion genero fecha_nacimiento'
      })
      .populate({
        path: 'peluquero',
        populate: [
          { path: 'sede', select: 'nombre' },
          { path: 'puestoTrabajo', select: 'nombre' },
          { path: 'usuario', populate: { path: 'rol', select: 'nombre' } }
        ],
        select: 'telefono_profesional direccion_profesional genero fecha_nacimiento especialidades experiencia'
      })
      .lean();

    const usuariosConDetalles = usuarios.map(usuario => {
      usuario.detalles = usuario.cliente || usuario.peluquero || null;
      delete usuario.cliente;
      delete usuario.peluquero;
      return usuario;
    });

    res.status(200).json(usuariosConDetalles);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al listar usuarios' });
  }
};

// ==========================
//   Obtener Usuario por ID
// ==========================
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id)
      .populate('rol', 'nombre')
      .lean();

    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (usuario.cliente) {
      const cliente = await Cliente.findById(usuario.cliente).lean();
      usuario.detalles = cliente || null;
    } else if (usuario.peluquero) {
      const peluquero = await Peluquero.findById(usuario.peluquero)
        .populate('sede', 'nombre')
        .populate('puestoTrabajo', 'nombre')
        .lean();
      usuario.detalles = peluquero || null;
    } else {
      usuario.detalles = null;
    }

    delete usuario.cliente;
    delete usuario.peluquero;

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuario' });
  }
};

// ==========================
//        Crear Usuario
// ==========================
const crearUsuario = async (req, res) => {
  try {
    const { nombre, correo, password, rol, estado, detalles } = req.body;

    // Validar rol
    if (!mongoose.Types.ObjectId.isValid(rol))
      return res.status(400).json({ error: 'Rol inválido' });

    const existeRol = await Rol.findById(rol);
    if (!existeRol)
      return res.status(404).json({ error: 'Rol no encontrado' });

    // Asignar explícitamente el empresaId del administrador que está creando el usuario
    const empresaAsignar = req.usuario?.empresaId;

    // Crear usuario
    const nuevoUsuario = new Usuario({ 
      nombre, 
      correo, 
      password, 
      rol, 
      estado,
      empresaId: empresaAsignar
    });

    if (existeRol.nombre === 'cliente') {
      const nuevoCliente = new Cliente({
        usuario: nuevoUsuario._id,
        telefono: detalles.telefono,
        direccion: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento,
        empresaId: empresaAsignar
      });
      await nuevoCliente.save();
      nuevoUsuario.cliente = nuevoCliente._id;

    } else if (existeRol.nombre === 'barbero' || existeRol.nombre === 'manicurista') {
      const planService = require('../services/plan.service');
      try {
        await planService.verificarLimitePeluqueros(empresaAsignar);
      } catch (limiteError) {
        return res.status(403).json({ error: limiteError.message });
      }

      const nuevoPeluquero = new Peluquero({
        usuario: nuevoUsuario._id,
        telefono_profesional: detalles.telefono,
        direccion_profesional: detalles.direccion,
        genero: detalles.genero,
        fecha_nacimiento: detalles.fecha_nacimiento,
        especialidades: detalles.especialidades,
        experiencia: detalles.experiencia,
        sede: detalles.sede,
        puestoTrabajo: detalles.puestoTrabajo,
        empresaId: empresaAsignar,
        tipoContrato: detalles.tipoContrato || 'herramientas_empresa'
      });
      await nuevoPeluquero.save();
      nuevoUsuario.peluquero = nuevoPeluquero._id;

      // Asignar puesto de inmediato si se indicó
      if (detalles.puestoTrabajo) {
        await PuestoTrabajo.findByIdAndUpdate(detalles.puestoTrabajo, { peluquero: nuevoPeluquero._id });
      }

      // 🔥 Populate usuario → rol para el peluquero
      await nuevoPeluquero.populate({ path: 'usuario', populate: { path: 'rol', select: 'nombre' } });
    }

    // 🔥 Populate rol del usuario recién creado
    await nuevoUsuario.populate('rol');

    await nuevoUsuario.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'CREAR',
      modulo: 'USUARIOS',
      descripcion: `Creó el usuario: ${nombre} con el rol: ${existeRol.nombre}`,
      entidadId: nuevoUsuario._id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(201).json(nuevoUsuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario', detalles: error.message });
  }
};

// ==========================
//      Actualizar Usuario
// ==========================
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, password, rol, estado, detalles } = req.body;

    const usuario = await Usuario.findById(id);
    if (!usuario) return res.status(404).json({ message: 'Usuario no encontrado' });

    let existeRol = null;
    if (rol && !mongoose.Types.ObjectId.isValid(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (rol) {
      existeRol = await Rol.findById(rol);
      if (!existeRol) return res.status(404).json({ error: 'Rol no encontrado' });
      usuario.rol = rol;
    } else {
      existeRol = await Rol.findById(usuario.rol);
    }

    usuario.nombre = nombre ?? usuario.nombre;
    usuario.correo = correo ?? usuario.correo;
    if (password) usuario.password = password;
    usuario.estado = estado ?? usuario.estado;
    await usuario.save();

    if (detalles) {
      const empresaAsignar = usuario.empresaId || req.usuario?.empresaId;

      if (existeRol.nombre === 'cliente') {
        if (!usuario.cliente) {
          const nuevoCliente = new Cliente({
            usuario: usuario._id,
            telefono: detalles.telefono,
            direccion: detalles.direccion,
            genero: detalles.genero,
            fecha_nacimiento: detalles.fecha_nacimiento,
            empresaId: empresaAsignar
          });
          await nuevoCliente.save();
          usuario.cliente = nuevoCliente._id;
          await usuario.save();
        } else {
          await Cliente.findByIdAndUpdate(usuario.cliente, {
            telefono: detalles.telefono,
            direccion: detalles.direccion,
            genero: detalles.genero,
            fecha_nacimiento: detalles.fecha_nacimiento
          });
        }
      } else if (existeRol.nombre === 'barbero' || existeRol.nombre === 'manicurista') {
        let peluquero = null;

        if (usuario.peluquero) {
          peluquero = await Peluquero.findById(usuario.peluquero);
        } else {
          peluquero = await Peluquero.findOne({ usuario: usuario._id });
        }

        if (!peluquero) {
          peluquero = new Peluquero({
            usuario: usuario._id,
            telefono_profesional: detalles.telefono || '',
            direccion_profesional: detalles.direccion || '',
            genero: detalles.genero || 'otro',
            fecha_nacimiento: detalles.fecha_nacimiento || null,
            especialidades: detalles.especialidades || [],
            experiencia: detalles.experiencia || 0,
            sede: detalles.sede || null,
            puestoTrabajo: detalles.puestoTrabajo || null,
            empresaId: empresaAsignar,
            tipoContrato: detalles.tipoContrato || 'herramientas_empresa'
          });
          await peluquero.save();
          usuario.peluquero = peluquero._id;
          await usuario.save();

          if (detalles.puestoTrabajo) {
            await PuestoTrabajo.findByIdAndUpdate(detalles.puestoTrabajo, { peluquero: peluquero._id });
          }
        } else {
          if (!usuario.peluquero || usuario.peluquero.toString() !== peluquero._id.toString()) {
            usuario.peluquero = peluquero._id;
            await usuario.save();
          }

          peluquero.telefono_profesional = detalles.telefono ?? peluquero.telefono_profesional;
          peluquero.direccion_profesional = detalles.direccion ?? peluquero.direccion_profesional;
          peluquero.genero = detalles.genero ?? peluquero.genero;
          peluquero.fecha_nacimiento = detalles.fecha_nacimiento || peluquero.fecha_nacimiento;
          peluquero.especialidades = detalles.especialidades ?? peluquero.especialidades;
          peluquero.experiencia = detalles.experiencia ?? peluquero.experiencia;
          peluquero.tipoContrato = detalles.tipoContrato ?? peluquero.tipoContrato;

          if (detalles.sede) peluquero.sede = detalles.sede;
          peluquero.estado = estado !== undefined ? estado : peluquero.estado;

          // 👇 usamos la función auxiliar
          if (detalles.puestoTrabajo || estado === false) {
            try {
              await actualizarPuestoPeluquero(peluquero, detalles.puestoTrabajo || null, estado);
            } catch (error) {
              return res.status(400).json({ message: error.message });
            }
          } else {
            await peluquero.save();
          }
        }
      }
    }

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'USUARIOS',
      descripcion: `Actualizó al usuario: ${usuario.nombre}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(200).json({ message: 'Usuario actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error en actualizarUsuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

// ==========================
//      Eliminar Usuario (Soft delete)
// ==========================
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findByIdAndUpdate(id, { estado: false }, { new: true });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ELIMINAR',
      modulo: 'USUARIOS',
      descripcion: `Desactivó al usuario: ${usuario.nombre} (soft delete)`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(200).json({ mensaje: 'Usuario desactivado exitosamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al desactivar usuario', error: error.message });
  }
};

// ==========================
//     Cambiar Estado Usuario
// ==========================
const cambiarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const usuario = await Usuario.findByIdAndUpdate(id, { estado }, { new: true });
    if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'USUARIOS',
      descripcion: `Cambió estado del usuario: ${usuario.nombre} a ${estado ? 'Activo' : 'Inactivo'}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(200).json({ mensaje: 'Estado del usuario actualizado', usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al cambiar estado del usuario', error: error.message });
  }
};

// ==========================
//     Subir Foto de Perfil
// ==========================
const { eliminarArchivoMinio, BUCKET_NAME } = require('../config/minio');

const subirFotoPerfil = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ mensaje: 'No se subió ninguna foto' });
    }

    // 🔹 Buscar usuario primero (no actualizar aún)
    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // 🗑️ Eliminar imagen anterior si existe
    if (usuario.foto) {
      await eliminarArchivoMinio(usuario.foto);
    }

    // 🔹 Construir URL real de MinIO
    let fotoUrl = req.file.location;
    if (!fotoUrl) {
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = process.env.MINIO_PORT && process.env.MINIO_PORT !== '443' && process.env.MINIO_PORT !== '80' ? `:${process.env.MINIO_PORT}` : '';
      const minioPublicUrl = process.env.MINIO_PUBLIC_URL || `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${endpoint}${port}`;
      fotoUrl = `${minioPublicUrl}/${BUCKET_NAME}/${req.file.key}`;
    }

    // 🔹 Guardar nueva foto
    usuario.foto = fotoUrl;
    await usuario.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario._id,
      accion: 'ACTUALIZAR',
      modulo: 'USUARIOS',
      descripcion: `Subió foto de perfil para el usuario: ${usuario.nombre}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(200).json({
      foto: usuario.foto,
      usuario
    });

  } catch (error) {
    console.error("🔥 ERROR MINIO:", error);
    return res.status(500).json({
      mensaje: 'Error al subir la foto de perfil',
      error: error.message
    });
  }
};

// ===================
//     Verificar Puesto
// ===================
const verificarPuesto = async (req, res) => {
  try {
    const { puestoId } = req.params;
    const { usuarioId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(puestoId))
      return res.status(400).json({ mensaje: 'ID de puesto inválido' });

    const puesto = await PuestoTrabajo.findById(puestoId)
      .populate('peluquero', 'usuario estado');
    if (!puesto) return res.status(404).json({ mensaje: 'Puesto no encontrado' });

    if (!puesto.peluquero || puesto.peluquero.estado === false)
      return res.json({ disponible: true });

    const peluqueroUsuarioId = puesto.peluquero.usuario ? puesto.peluquero.usuario.toString() : null;
    if (usuarioId && peluqueroUsuarioId && peluqueroUsuarioId === usuarioId.toString())
      return res.json({ disponible: true });

    return res.json({ disponible: false });
  } catch (error) {
    return res.status(500).json({ mensaje: 'Error en el servidor' });
  }
};

// ==========================
// 👤 Obtener perfil
// ==========================
const obtenerPerfil = async (req, res) => {
  try {

    const usuario = await Usuario.findById(req.uid)
      .populate('rol')
      .populate('empresaId')
      .populate({
        path: 'cliente',
        populate: { path: 'usuario' }
      })
      .populate({
        path: 'peluquero',
        populate: [
          { path: 'sede' },
          { path: 'puestoTrabajo' },
          { path: 'usuario' }
        ]
      });

    if (!usuario) {
      return res.status(404).json({ msg: 'Usuario no encontrado' });
    }

    const rolNombre = usuario.rol?.nombre?.toLowerCase();
    const empresaLogo = rolNombre === 'superadmin' ? 'assets/sede.png' : (usuario.empresaId?.logo || 'assets/sede.png');
    const empresaNombre = usuario.empresaId?.nombre || 'Style Manager';

    if (rolNombre === 'cliente' && usuario.cliente) {
      return res.json({
        tipo: 'cliente',
        ...usuario.cliente.toObject(),
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol.nombre,
          foto: usuario.foto,
          empresaLogo,
          empresaNombre,
          empresaId: usuario.empresaId
        }
      });
    }

    if ((rolNombre === 'barbero' || rolNombre === 'manicurista') && usuario.peluquero) {
      return res.json({
        tipo: rolNombre,
        ...usuario.peluquero.toObject(),
        usuario: {
          id: usuario._id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol.nombre,
          foto: usuario.foto,
          empresaLogo,
          empresaNombre,
          empresaId: usuario.empresaId
        }
      });
    }

    return res.json({
      tipo: 'admin',
      usuario: {
        id: usuario._id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol.nombre,
        foto: usuario.foto,
        empresaLogo,
        empresaNombre,
        empresaId: usuario.empresaId
      }
    });

  } catch (error) {
    res.status(500).json({ msg: 'Error al obtener perfil' });
  }
};

// ==========================
// ✏️ Actualizar perfil
// ==========================
const actualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const datos = req.body;

    // Obtener usuario actual
    const usuarioActual = await Usuario.findById(usuarioId);
    if (!usuarioActual) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    let nuevaFoto = datos.foto ?? usuarioActual.foto;
    if (req.file) {
      nuevaFoto = req.file.location;
      if (!nuevaFoto) {
        const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
        const port = process.env.MINIO_PORT && process.env.MINIO_PORT !== '443' && process.env.MINIO_PORT !== '80' ? `:${process.env.MINIO_PORT}` : '';
        const minioPublicUrl = process.env.MINIO_PUBLIC_URL || `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${endpoint}${port}`;
        nuevaFoto = `${minioPublicUrl}/${BUCKET_NAME}/${req.file.key}`;
      }
      // Opcional: Eliminar foto anterior si cambió
      if (usuarioActual.foto && usuarioActual.foto !== nuevaFoto) {
        try {
          await eliminarArchivoMinio(usuarioActual.foto);
        } catch (e) {
          console.error("No se pudo eliminar la foto anterior", e);
        }
      }
    }

    // Actualizar datos generales del usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      usuarioId,
      {
        nombre: datos.nombre ?? usuarioActual.nombre,
        correo: datos.correo ?? usuarioActual.correo,
        genero: datos.genero ?? usuarioActual.genero,
        fecha_nacimiento: datos.fecha_nacimiento ?? usuarioActual.fecha_nacimiento,
        foto: nuevaFoto
      },
      { new: true }
    ).populate("rol");

    let perfilExtra = null;

    switch (usuarioActualizado.rol.nombre) {
      case "barbero":
      case "manicurista":
        // Actualizar perfil de peluquero y poblar usuario → rol
        perfilExtra = await Peluquero.findOneAndUpdate(
          { usuario: usuarioId },
          {
            especialidades: datos.especialidades,
            experiencia: datos.experiencia,
            direccion_profesional: datos.direccion_profesional,
            telefono_profesional: datos.telefono_profesional,
            tipoContrato: datos.tipoContrato
          },
          { new: true }
        ).populate({
          path: 'usuario',
          populate: { path: 'rol', select: 'nombre' }
        });
        break;

      case "cliente":
        perfilExtra = await Cliente.findOneAndUpdate(
          { usuario: usuarioId },
          {
            direccion: datos.direccion,
            telefono: datos.telefono
          },
          { new: true }
        );
        break;

      case "admin":
        perfilExtra = { permisos: "completos" };
        break;
    }

    // Combinar datos del usuario con su perfil específico
    const perfilCompleto = {
      ...usuarioActualizado.toObject(),
      [usuarioActualizado.rol.nombre]: perfilExtra
    };

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario.id,
      accion: 'ACTUALIZAR',
      modulo: 'USUARIOS',
      descripcion: `Actualizó su propio perfil: ${usuarioActualizado.nombre}`,
      entidadId: usuarioId,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.json({
      mensaje: "Perfil actualizado correctamente",
      usuario: perfilCompleto
    });
  } catch (error) {
    console.error("❌ Error en actualizarPerfil:", error);
    res.status(500).json({ mensaje: "Error al actualizar perfil", error: error.message });
  }
};

// ==========================
// 🔑 Cambiar contraseña
// ==========================
const cambiarPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { actual, nueva } = req.body;

    if (!actual || !nueva) {
      return res.status(400).json({ mensaje: 'Debe proveer la contraseña actual y la nueva' });
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    // Validar contraseña actual
    const passwordValida = await usuario.compararPassword(actual);
    if (!passwordValida) {
      return res.status(400).json({ mensaje: 'La contraseña actual es incorrecta' });
    }

    // Guardar nueva contraseña (se hashea automáticamente en el modelo)
    usuario.password = nueva;
    await usuario.save();

    // Registrar acción en auditoría
    HistorialService.registrarAccion({
      usuario: req.usuario ? req.usuario._id : id,
      accion: 'ACTUALIZAR',
      modulo: 'USUARIOS',
      descripcion: `Actualizó la contraseña del usuario: ${usuario.nombre}`,
      entidadId: id,
      ip: req.ip || req.connection.remoteAddress,
      dispositivo: req.headers['user-agent']
    });

    res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    res.status(500).json({ mensaje: 'Error al cambiar contraseña', error: error.message });
  }
};

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario,
  subirFotoPerfil,
  verificarPuesto,
  actualizarPerfil,
  obtenerPerfil,
  cambiarPassword
};
