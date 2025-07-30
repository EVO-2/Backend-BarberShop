const usuarioService = require('../services/usuario.service');
const Usuario = require('../models/Usuario.model');

// ======================= Crear un nuevo usuario =======================
const crearUsuario = async (req, res) => {
  try {
    const nuevoUsuario = await usuarioService.crearUsuario(req.body);
    res.status(201).json(nuevoUsuario);
  } catch (error) {
    console.error('❌ Error al crear usuario:', error);
    res.status(500).json({ mensaje: error.message || 'Error interno al crear usuario' });
  }
};

// ======================= Listar todos los usuarios =======================
const listarUsuarios = async (req, res) => {
  try {
    const usuarios = await usuarioService.obtenerUsuarios();
    res.status(200).json(usuarios);
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error);
    res.status(500).json({ mensaje: error.message || 'Error interno al obtener usuarios' });
  }
};

// ======================= Obtener usuario por ID =======================
const obtenerUsuario = async (req, res) => {
  try {
    const usuario = await usuarioService.obtenerUsuarioPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.status(200).json(usuario);
  } catch (error) {
    console.error('❌ Error al obtener usuario:', error);
    res.status(500).json({ mensaje: error.message || 'Error interno al obtener usuario' });
  }
};

// ======================= Actualizar usuario =======================
const actualizarUsuario = async (req, res) => {
  try {
    const usuarioActualizado = await usuarioService.actualizarUsuario(req.params.id, req.body);
    res.status(200).json(usuarioActualizado);
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    res.status(500).json({ mensaje: error.message || 'Error interno al actualizar usuario' });
  }
};

// ======================= Eliminar (Soft Delete) usuario =======================
const eliminarUsuario = async (req, res) => {
  try {
    const usuarioDesactivado = await usuarioService.eliminarUsuario(req.params.id);
    res.status(200).json({ mensaje: 'Usuario desactivado correctamente', usuario: usuarioDesactivado });
  } catch (error) {
    console.error('❌ Error al desactivar usuario:', error);
    res.status(500).json({ mensaje: error.message || 'Error interno al desactivar usuario' });
  }
};

// ======================= Cambiar estado (activar/desactivar) =======================
const cambiarEstadoUsuario = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const usuarioActualizado = await usuarioService.cambiarEstadoUsuario(id, estado);

    if (!usuarioActualizado) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Estado actualizado correctamente', usuario: usuarioActualizado });
  } catch (error) {
    console.error('❌ Error al cambiar estado del usuario:', error);
    res.status(500).json({ mensaje: error.message || 'Error al cambiar el estado del usuario' });
  }
};

// ======================= Subir foto de perfil =======================
const subirFotoPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    usuario.foto = `uploads/${req.file.filename}`;
    await usuario.save();

    res.json({ mensaje: 'Foto actualizada correctamente', foto: usuario.foto });
  } catch (error) {
    console.error('❌ Error al subir la foto:', error);
    res.status(500).json({ mensaje: 'Error al subir la foto', error: error.message });
  }
};

// ======================= Exporta todas las funciones =======================
module.exports = {
  crearUsuario,
  listarUsuarios,
  obtenerUsuario,
  actualizarUsuario,
  eliminarUsuario,
  cambiarEstadoUsuario,
  subirFotoPerfil
};
