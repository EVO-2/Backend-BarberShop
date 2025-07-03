const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuariosController');
const { validarUsuario, manejarErrores } = require('../middlewares/validarUsuario');
const verificarToken = require('../middlewares/verificarToken');
const validarRol = require('../middlewares/validarRol');

// ✅ Ruta de prueba sin autenticación
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

// ✅ Rutas protegidas: Solo ADMIN puede acceder
router.get('/', verificarToken, validarRol('admin'), usuariosController.getUsuarios);
router.get('/:id', verificarToken, validarRol('admin'), usuariosController.getUsuarioPorId);

router.post('/', verificarToken, validarRol('admin'), validarUsuario, manejarErrores, usuariosController.crearUsuario);
router.put('/:id', verificarToken, validarRol('admin'), validarUsuario, manejarErrores, usuariosController.actualizarUsuario);

router.delete('/:id', verificarToken, validarRol('admin'), usuariosController.eliminarUsuario);

router.put('/:id/activar', usuariosController.activarUsuario);
router.put('/:id/desactivar', usuariosController.desactivarUsuario);

module.exports = router;
