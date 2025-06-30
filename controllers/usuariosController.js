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
    // Verificar si ya existe el usuario con ese correo
    const existe = await usuariosService.obtenerPorCorreo(correo);
    if (existe) {
      return res.status(409).json({ mensaje: 'El correo ya está registrado' });
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
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
        rol: nuevoUsuario.rol
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error.message);
    res.status(500).json({ mensaje: 'Error interno al crear usuario' });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const usuarioActualizado = await usuariosService.actualizar(req.params.id, req.body);
    res.json(usuarioActualizado);
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
