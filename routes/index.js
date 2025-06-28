const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');

const setupRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuariosRoutes);
};

module.exports = setupRoutes;
