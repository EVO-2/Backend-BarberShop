const { Cliente } = require('../models');

const clientesService = {
  async crearCliente(data) {
    return await Cliente.create(data);
  },

  async obtenerClientes() {
    return await Cliente.findAll();
  },

  async obtenerClientePorId(id) {
    return await Cliente.findByPk(id);
  },

  async actualizarCliente(id, data) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return null;
    return await cliente.update(data);
  },

  async eliminarCliente(id) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return null;
    await cliente.destroy();
    return cliente;
  }
};

module.exports = clientesService;
