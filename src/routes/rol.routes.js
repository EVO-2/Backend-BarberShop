const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');
const Rol = require('../models/Rol.model');
const { validarJWT } = require('../middlewares/validarJWT');
const { tieneRol } = require('../middlewares/validarRol');

// ===============================
// 📌 CREAR ROL (Solo SuperAdmin)
// ===============================
router.post('/', validarJWT, tieneRol('superadmin'), rolController.crearRol);

// ===============================
// 📌 LISTAR ROLES (solo activos)
// ===============================
router.get('/', validarJWT, async (req, res) => {
  try {
    const roles = await Rol.find({ estado: true })
      .populate('permisos', 'nombre modulo');

    return res.json({
      ok: true,
      roles
    });

  } catch (error) {
    console.error('Error al obtener roles:', error);
    return res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener roles'
    });
  }
});

// ===============================
// 📌 OBTENER ROL POR ID
// ===============================
router.get('/:id', validarJWT, (req, res, next) => {
  const { id } = req.params;

  if (!id || id.trim() === '') {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido'
    });
  }

  return rolController.obtenerRol(req, res, next);
});

// ===============================
// 📌 ACTUALIZAR ROL (Solo SuperAdmin)
// ===============================
router.put('/:id', validarJWT, tieneRol('superadmin'), (req, res, next) => {
  const { id } = req.params;

  if (!id || id.trim() === '') {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido'
    });
  }

  return rolController.actualizarRol(req, res, next);
});

// ===============================
// 📌 ELIMINAR ROL (SOFT DELETE) (Solo SuperAdmin)
// ===============================
router.delete('/:id', validarJWT, tieneRol('superadmin'), (req, res, next) => {
  const { id } = req.params;

  if (!id || id.trim() === '') {
    return res.status(400).json({
      ok: false,
      mensaje: 'ID inválido'
    });
  }

  return rolController.eliminarRol(req, res, next);
});

module.exports = router;
