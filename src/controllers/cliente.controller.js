const bcrypt = require('bcryptjs');
const Cliente = require('../models/Cliente.model');
const Usuario = require('../models/Usuario.model');

/* ───────────── Obtener perfil del cliente autenticado ───────────── */
const obtenerPerfilCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ usuario: req.uid })
      .populate('usuario', 'nombre correo foto estado') // 🔹 Traemos info del usuario
      .lean();

    if (!cliente) {
      return res.status(404).json({ ok: false, msg: 'Perfil de cliente no encontrado' });
    }

    return res.json({ ok: true, data: cliente });
  } catch (error) {
    console.error('❌ Error al obtener perfil cliente:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Error al obtener perfil cliente',
      error: error.message,
    });
  }
};

/* ───────────── Actualizar perfil del cliente ───────────── */
const actualizarPerfilCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findOne({ usuario: req.uid });
    if (!cliente) {
      return res.status(404).json({ ok: false, msg: 'Perfil de cliente no encontrado' });
    }

    const { telefono, direccion, genero, fecha_nacimiento, nombre, password } = req.body;

    // 🔹 Actualizar Usuario
    const usuario = await Usuario.findById(req.uid);
    if (!usuario) {
      return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
    }

    if (nombre) usuario.nombre = nombre;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(password, salt);
    }
    if (req.file) usuario.foto = req.file.location;

    await usuario.save();

    // 🔹 Actualizar Cliente
    cliente.telefono = telefono ?? cliente.telefono;
    cliente.direccion = direccion ?? cliente.direccion;
    cliente.genero = genero ?? cliente.genero;
    cliente.fecha_nacimiento = fecha_nacimiento ?? cliente.fecha_nacimiento;

    await cliente.save();

    // 🔹 Devolver perfil actualizado (usuario + cliente)
    const perfilActualizado = await Cliente.findOne({ usuario: req.uid })
      .populate('usuario', 'nombre correo foto estado')
      .lean();

    return res.json({
      ok: true,
      msg: 'Perfil actualizado correctamente',
      data: perfilActualizado,
    });
  } catch (error) {
    console.error('❌ Error al actualizar perfil cliente:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Error al actualizar perfil cliente',
      error: error.message,
    });
  }
};

/* ───────────── Listar todos los clientes ───────────── */
const obtenerClientes = async (req, res) => {
  try {
    const clientes = await Cliente.find()
      .populate('usuario', 'nombre correo foto estado')
      .lean();

    return res.json({ ok: true, data: clientes });
  } catch (error) {
    console.error('❌ Error al obtener clientes:', error);
    return res.status(500).json({
      ok: false,
      msg: 'Error al obtener clientes',
      error: error.message,
    });
  }
};

module.exports = {
  obtenerPerfilCliente,
  actualizarPerfilCliente,
  obtenerClientes,
};
