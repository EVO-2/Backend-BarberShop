const usuariosService = require('../services/usuariosService');

exports.getUsuarios = async (req, res) => {
  try {
    const usuarios = await usuariosService.obtenerTodos();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsuarioPorId = async (req, res) => {
  try {
    const usuario = await usuariosService.obtenerPorId(req.params.id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.crearUsuario = async (req, res) => {
  try {
    const usuario = await usuariosService.crear(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarUsuario = async (req, res) => {
  try {
    const usuario = await usuariosService.actualizar(req.params.id, req.body);
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.eliminarUsuario = async (req, res) => {
  try {
    await usuariosService.eliminar(req.params.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
