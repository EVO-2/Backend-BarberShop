// routes/usuarios.routes.js
const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');

// Ruta: GET /api/usuarios
router.get('/', usuariosController.getUsuarios);

// Ruta: GET /api/usuarios/:id
router.get('/:id', usuariosController.getUsuarioPorId);

// Ruta: POST /api/usuarios
router.post('/', usuariosController.crearUsuario);

// Ruta: PUT /api/usuarios/:id
router.put('/:id', usuariosController.actualizarUsuario);

// Ruta: DELETE /api/usuarios/:id
router.delete('/:id', usuariosController.eliminarUsuario);

module.exports = router;
