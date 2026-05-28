const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

// Cargar plugin antes de compilar modelos
const { tenantPlugin, tenantStorage } = require('../src/plugins/tenant');
mongoose.plugin(tenantPlugin);

// Cargar modelos
const Usuario = require('../src/models/Usuario.model');
const Producto = require('../src/models/Producto.model');
const Cita = require('../src/models/Cita.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const usuarioVip = await Usuario.findOne({ correo: 'aislado@vip.com' });
    console.log('Usuario VIP empresaId:', usuarioVip.empresaId);

    tenantStorage.run(usuarioVip.empresaId, async () => {
      console.log('--- Contexto Tenant Establecido ---');
      const productos = await Producto.find();
      console.log('Productos encontrados:', productos.length);

      const citas = await Cita.find();
      console.log('Citas encontradas:', citas.length);
      
      const citasAgg = await Cita.aggregate([{ $match: {} }]);
      console.log('Citas Agg encontradas:', citasAgg.length);
      
      mongoose.disconnect();
    });
  })
  .catch(err => {
    console.error(err);
    mongoose.disconnect();
  });
