const Empresa = require('../models/Empresa.model');

const validarSuscripcion = async (req, res, next) => {
    try {
        const empresaId = req.usuario?.empresaId;

        // Si es un SuperAdmin o un usuario sin empresa, dejar pasar (para paneles maestros)
        if (!empresaId) {
            return next();
        }

        const empresa = await Empresa.findById(empresaId);

        if (!empresa) {
            return res.status(404).json({ msg: 'Empresa no encontrada en el sistema' });
        }

        // Guardamos la empresa en la request por si otros controllers la necesitan
        req.empresa = empresa;

        // Excepciones: Rutas a las que el usuario sí puede entrar estando bloqueado (perfil y pagos)
        const rutasExcluidas = ['/api/pagos', '/api/suscripciones', '/api/usuarios/perfil'];
        const esRutaExcluida = rutasExcluidas.some(ruta => req.originalUrl.includes(ruta));

        const estadosBloqueados = ['vencida', 'suspendida', 'cancelada'];
        
        if (estadosBloqueados.includes(empresa.suscripcionEstado) && !esRutaExcluida) {
            return res.status(403).json({
                msg: 'Acceso bloqueado: La suscripción de la barbería está inactiva.',
                codigo_suscripcion: empresa.suscripcionEstado,
                accionRequerida: 'pagar_suscripcion'
            });
        }

        next();

    } catch (error) {
        console.error('[Validar Suscripcion Error]', error);
        return res.status(500).json({ msg: 'Error al verificar el estado de la suscripción' });
    }
};

module.exports = {
    validarSuscripcion
};
