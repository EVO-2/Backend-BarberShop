const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');

// ===============================
// 📌 CREAR ROL
// ===============================
router.post('/', rolController.crearRol);

// ===============================
// 📌 LISTAR ROLES (solo activos)
// ===============================
router.get('/', async (req, res) => {
  try {
    const roles = await require('../models/Rol.model')
      .find({ estado: true })
      .populate('permisos', 'nombre modulo');

    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

// ===============================
// 📌 OBTENER ROL POR ID
// ===============================
router.get('/:id', rolController.obtenerRol);

// ===============================
// 📌 ACTUALIZAR ROL
// ===============================
router.put('/:id', rolController.actualizarRol);

// ===============================
// 📌 ELIMINAR ROL (SOFT DELETE)
// ===============================
router.delete('/:id', rolController.eliminarRol);

module.exports = router;