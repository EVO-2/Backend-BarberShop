const express = require('express');
const router = express.Router();
const { obtenerSedes } = require('../controllers/sede.controller');

router.get('/', obtenerSedes);

module.exports = router;