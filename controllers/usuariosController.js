const bcrypt = require('bcryptjs');
const usuariosService = require('../services/usuariosService');

exports.getUsuarios = async (req, res) => {
  try {
    const usuarios = await usuariosService.obtenerTodos();
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error.message);
    res.status(500).json({ mensaje: 'Error interno al obtener usuarios' });
  }
};

exports.getUsuarioPorId = async (req, res) => {
  try {
    const usuario = await usuariosService.obtenerPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error.message);
    res.status(500).json({ mensaje: 'Error interno al buscar usuario' });
  }
};

exports.crearUsuario = async (req, res) => {
  const { nombre, correo, password, rol } = req.body;

  if (!correo || !password || !rol) {
    return res.status(400).json({ mensaje: 'Campos obligatorios: correo, password, rol' });
  }

  try {
    const existe = await usuariosService.obtenerPorCorreo(correo);
    if (existe) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const nuevoUsuario = await usuariosService.crear({
      nombre,
      correo,
      password: hashedPassword,
      rol,
      estado: true
    });

    res.status(201).json({
      mensaje: 'Usuario creado exitosamente',
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        correo: nuevoUsuario.correo,
        rol: nuevoUsuario.rol,
        estado: nuevoUsuario.estado
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno al crear usuario' });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const { nombre, correo, password, rol, estado } = req.body;
    const actualizaciones = {};

    if (nombre !== undefined) actualizaciones.nombre = nombre;
    if (correo !== undefined) actualizaciones.correo = correo;
    if (rol !== undefined) actualizaciones.rol = rol;
    if (estado !== undefined) actualizaciones.estado = estado;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      actualizaciones.password = hashedPassword;
    }

    const usuarioActualizado = await usuariosService.actualizar(req.params.id, actualizaciones);

    res.json({
      mensaje: 'Usuario actualizado correctamente',
      usuario: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error.message);
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    await usuariosService.eliminar(req.params.id);
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error.message);
    res.status(500).json({ mensaje: 'Error al eliminar usuario' });
  }
};


exports.activarUsuario = async (req, res) => {
  try {
    const usuario = await usuariosService.activarUsuario(req.params.id);
    res.json({ mensaje: 'Usuario activado correctamente', usuario });
  } catch (error) {
    console.error('Error al activar usuario:', error.message);
    res.status(500).json({ mensaje: 'Error al activar usuario' });
  }
};

exports.desactivarUsuario = async (req, res) => {
  try {
    const usuario = await usuariosService.desactivarUsuario(req.params.id);
    res.json({ mensaje: 'Usuario desactivado correctamente', usuario });
  } catch (error) {
    console.error('Error al desactivar usuario:', error.message);
    res.status(500).json({ mensaje: 'Error al desactivar usuario' });
  }
};
