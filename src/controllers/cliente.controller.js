const Cliente = require('../models/Cliente.model');
const Usuario = require('../models/Usuario.model');

// Obtener perfil extendido de cliente
const obtenerPerfilCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ usuario: req.uid }).populate('usuario', '-password');
    if (!cliente) {
      return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('❌ Error al obtener perfil cliente:', error);
    res.status(500).json({ mensaje: 'Error al obtener perfil cliente' });
  }
};

// Actualizar perfil extendido de cliente (foto incluida)
const actualizarPerfilCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ usuario: req.uid });
    if (!cliente) {
      return res.status(404).json({ mensaje: 'Perfil de cliente no encontrado' });
    }

    const { telefono, direccion, genero, fecha_nacimiento, nombre, password } = req.body;

    // Actualiza Usuario si es necesario
    const usuario = await Usuario.findById(req.uid);
    if (nombre) usuario.nombre = nombre;
    if (password) usuario.password = password;
    if (req.file) usuario.foto = req.file.filename;
    await usuario.save();

    // Actualiza Cliente
    cliente.telefono = telefono;
    cliente.direccion = direccion;
    cliente.genero = genero;
    cliente.fecha_nacimiento = fecha_nacimiento;
    await cliente.save();

    res.json({ mensaje: 'Perfil de cliente actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar perfil cliente:', error);
    res.status(500).json({ mensaje: 'Error al actualizar perfil cliente' });
  }
};

// Listar todos los clientes (para dropdown en reservas)
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find()
      .populate('usuario', 'nombre correo')
      .lean();

    res.json(clientes);
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error);
    res.status(500).json({ mensaje: 'Error al obtener clientes' });
  }
};

module.exports = {
  obtenerPerfilCliente,
  actualizarPerfilCliente,
  obtenerClientes
};
