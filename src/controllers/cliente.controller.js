// controllers/cliente.controller.js
const Cliente = require('../models/Cliente.model');

/** GET /api/clientes?estado=true|false */
const listarClientes = async (req, res) => {
  try {
    const { estado } = req.query;          // 'true' | 'false' | undefined
    const filtro = {};

    if (estado !== undefined) {
      filtro.estado = estado === 'true';   // convierte string a booleano
    }

    const clientes = await Cliente
      .find(filtro)
      .populate('usuario', 'nombre correo'); // trae nombre y correo del usuario
    res.json(clientes);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({ mensaje: 'Error al listar clientes' });
  }
};

/** GET /api/clientes/:id */
const obtenerCliente = async (req, res) => {
  try {
    const cliente = await Cliente
      .findById(req.params.id)
      .populate('usuario', 'nombre correo');
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener cliente' });
  }
};

/** POST /api/clientes */
const crearCliente = async (req, res) => {
  try {
    const nuevo = new Cliente(req.body);
    await nuevo.save();
    res.status(201).json(nuevo);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al crear cliente', error });
  }
};

/** PUT /api/clientes/:id */
const actualizarCliente = async (req, res) => {
  try {
    const actualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar cliente', error });
  }
};

/** PATCH /api/clientes/:id/estado */
const actualizarEstado = async (req, res) => {
  try {
    const { estado } = req.body;                   // boolean esperado
    const actualizado = await Cliente.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );
    if (!actualizado) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json(actualizado);
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al actualizar estado', error });
  }
};

/** DELETE /api/clientes/:id */
const eliminarCliente = async (req, res) => {
  try {
    const eliminado = await Cliente.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar cliente', error });
  }
};

module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  actualizarEstado,
  eliminarCliente
};
