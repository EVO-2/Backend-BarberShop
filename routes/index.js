const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
//const clientesRoutes = require('./clientes.routes');

const setupRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  //app.use('/api/clientes', clientesRoutes);
};

module.exports = setupRoutes;
