const { Router } = require('express');

const {
    crearCategoria,
    obtenerCategorias,
    obtenerCategoria,
    actualizarCategoria,
    eliminarCategoria
} = require('../controllers/categoria.controller');

const { validarJWT } = require('../middlewares/validarJWT');

const router = Router();

// 🔐 Middleware global
router.use(validarJWT);

// CRUD
router.post('/', crearCategoria);
router.get('/', obtenerCategorias);
router.get('/:id', obtenerCategoria);
router.put('/:id', actualizarCategoria);
router.delete('/:id', eliminarCategoria);

module.exports = router;