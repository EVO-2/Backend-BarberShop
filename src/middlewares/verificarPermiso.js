const verificarPermiso = (...permisosRequeridos) => {
    return async (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(500).json({
                    mensaje: 'Token no validado'
                });
            }

            const rol = req.usuario.rol;

            if (!rol) {
                return res.status(403).json({
                    mensaje: 'Usuario sin rol asignado'
                });
            }

            const permisosUsuario = rol.permisos || [];

            // 🔹 Convertimos a nombres de permisos de forma segura
            const nombresPermisos = permisosUsuario.map(p => {
                if (typeof p === 'string') return p;
                if (p.nombre) return p.nombre;
                if (p.toString) return p.toString();
                return null;
            }).filter(Boolean);

            const tienePermiso = permisosRequeridos.some(p =>
                nombresPermisos.includes(p)
            );

            if (!tienePermiso) {
                return res.status(403).json({
                    mensaje: `No tienes permisos suficientes. Requerido: [${permisosRequeridos.join(', ')}]`
                });
            }

            next();

        } catch (error) {
            res.status(500).json({
                mensaje: 'Error en verificación de permisos',
                error
            });
        }
    };
};

module.exports = { verificarPermiso };
