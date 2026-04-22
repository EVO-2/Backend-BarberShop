const { Router } = require('express');

const {
    crearProveedor,
    obtenerProveedores,
    obtenerProveedor,
    actualizarProveedor,
    eliminarProveedor
} = require('../controllers/proveedor.controller');

const { validarJWT } = require('../middlewares/validarJWT');

const router = Router();

// 🔐 Protección global
router.use(validarJWT);

// CRUD
router.post('/', crearProveedor);
router.get('/', obtenerProveedores);
router.get('/:id', obtenerProveedor);
router.put('/:id', actualizarProveedor);
router.delete('/:id', eliminarProveedor);

module.exports = router;