// routes/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');

// Rutas RESTful
router.get('/', usuariosController.getUsuarios);
router.get('/:id', usuariosController.getUsuarioPorId);
router.post('/', usuariosController.crearUsuario);
router.put('/:id', usuariosController.actualizarUsuario);
router.delete('/:id', usuariosController.eliminarUsuario);

// Ruta de prueba usando Sequelize
router.get('/test-db', async (req, res) => {
  try {
    const { Usuario } = require('../models');
    const test = await Usuario.findOne();
    res.json({
      mensaje: 'Conexión exitosa a la base de datos ✅',
      resultado: test ? test : 'No hay usuarios aún'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: '❌ Error al conectar con Sequelize',
      error: error.message
    });
  }
});

module.exports = router;
