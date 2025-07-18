// routes/cliente.routes.js
const { Router } = require('express');
const ctr = require('../controllers/cliente.controller');
const router = Router();
const { validarJWT } = require('../middlewares/validarJWT');  
const { tieneRol }   = require('../middlewares/validarRol');  


router.get('/', ctr.listarClientes);
router.get('/:id', ctr.obtenerCliente);
router.post('/', ctr.crearCliente);
router.put('/:id', ctr.actualizarCliente);
router.patch('/:id/estado', ctr.actualizarEstado);
router.delete('/:id', ctr.eliminarCliente);

module.exports = router;
