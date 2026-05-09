const { Router } = require('express');
const { check } = require('express-validator');
const validarCampos = require('../middlewares/validarCampos');
const { registrarEmpresa } = require('../controllers/onboarding.controller');

const { createUploadMiddleware } = require('../middlewares/upload');
const uploadLogo = createUploadMiddleware('logos');

const router = Router();

// ==========================================
// 🏢 RUTAS DE ONBOARDING (PÚBLICAS)
// ==========================================

// POST: /api/onboarding/registrar
router.post('/registrar', [
    (req, res, next) => {
        uploadLogo.single('logo')(req, res, function (err) {
            if (err) {
                console.error('❌ Error de multer/S3:', err);
                return res.status(500).json({ msg: 'Error al procesar la imagen', error: err.message });
            }
            next();
        });
    },
    (req, res, next) => {
        try {
            if (req.body.empresa && typeof req.body.empresa === 'string') {
                req.body.empresa = JSON.parse(req.body.empresa);
            }
            if (req.body.usuario && typeof req.body.usuario === 'string') {
                req.body.usuario = JSON.parse(req.body.usuario);
            }
        } catch (e) {
            console.error('Error parseando body:', e);
            return res.status(400).json({ msg: 'Formato de datos inválido' });
        }
        next();
    },
    check('empresa.nombre', 'El nombre de la empresa es obligatorio').not().isEmpty(),
    check('usuario.nombre', 'El nombre del usuario es obligatorio').not().isEmpty(),
    check('usuario.correo', 'El correo no es válido').isEmail(),
    check('usuario.password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
    validarCampos
], registrarEmpresa);

module.exports = router;
