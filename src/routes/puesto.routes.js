const express = require('express');
const router = express.Router();
const { obtenerPuestos } = require('../controllers/puesto.controller');

router.get('/', obtenerPuestos);

module.exports = router;