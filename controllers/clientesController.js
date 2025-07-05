const clientesService = require('../services/clientesService');

exports.crearCliente = async (req, res) => {
  try {
    const cliente = await clientesService.crearCliente(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    console.error('❌ Error en crearCliente:', error); // 🔍 Aquí veremos el error real
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

exports.obtenerClientes = async (req, res) => {
  try {
    const clientes = await clientesService.obtenerClientes();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

exports.obtenerClientePorId = async (req, res) => {
  try {
    const cliente = await clientesService.obtenerClientePorId(req.params.id);
    if (cliente) {
      res.json(cliente);
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

exports.actualizarCliente = async (req, res) => {
  try {
    const actualizado = await clientesService.actualizarCliente(req.params.id, req.body);
    if (actualizado) {
      res.json(actualizado);
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

exports.eliminarCliente = async (req, res) => {
  try {
    const eliminado = await clientesService.eliminarCliente(req.params.id);
    if (eliminado) {
      res.json({ mensaje: 'Cliente eliminado' });
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

exports.cambiarEstadoCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // true o false

    const cliente = await clientesService.actualizarCliente(id, { estado });

    if (cliente) {
      res.json({ mensaje: `Cliente ${estado ? 'activado' : 'desactivado'}` });
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar estado del cliente' });
  }
};
