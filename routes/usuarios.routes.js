const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { validarUsuario, manejarErrores } = require('../middlewares/validarUsuario');

// ✅ Ruta de prueba: debe ir antes de las rutas con parámetros dinámicos
router.get('/test-db', async (req, res) => {
  try {
    const { Usuario } = require('../models');
    const test = await Usuario.findOne();
    res.json({
      mensaje: 'Conexión exitosa a la base de datos ✅',
      resultado: test || 'No hay usuarios aún'
    });
  } catch (error) {
    res.status(500).json({
      mensaje: '❌ Error al conectar con Sequelize',
      error: error.message
    });
  }
});

// ✅ Rutas RESTful protegidas con validaciones donde aplica
router.get('/', usuariosController.getUsuarios);
router.get('/:id', usuariosController.getUsuarioPorId);

router.post('/', validarUsuario, manejarErrores, usuariosController.crearUsuario);
router.put('/:id', validarUsuario, manejarErrores, usuariosController.actualizarUsuario);

router.delete('/:id', validarUsuario, usuariosController.eliminarUsuario);

module.exports = router;
