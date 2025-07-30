const express = require('express');
const router = express.Router();
const Rol = require('../models/Rol.model');

router.get('/', async (req, res) => {
  try {
    const roles = await Rol.find({ estado: true });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener roles' });
  }
});

module.exports = router;