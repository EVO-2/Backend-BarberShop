const express = require('express');
const router = express.Router();

const {
    getPermisos,
    crearPermiso,
    actualizarPermiso,
    eliminarPermiso
} = require('../controllers/permisos.controller');

router.get('/', getPermisos);
router.post('/', crearPermiso);
router.put('/:id', actualizarPermiso);
router.delete('/:id', eliminarPermiso);

module.exports = router;