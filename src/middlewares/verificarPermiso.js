const verificarPermiso = (...permisosRequeridos) => {
    return async (req, res, next) => {
        try {
            if (!req.usuario) {
                return res.status(500).json({
                    mensaje: 'Token no validado'
                });
            }

            // 🔹 El rol puede venir poblado o como string
            const rol = req.usuario.rol;

            if (!rol) {
                return res.status(403).json({
                    mensaje: 'Usuario sin rol asignado'
                });
            }

            // 🔹 Si no viene populate, aquí se rompe → solución abajo
            const permisosUsuario = rol.permisos || [];

            // 🔹 Convertimos a nombres de permisos
            const nombresPermisos = permisosUsuario.map(p =>
                typeof p === 'string' ? p : p.nombre
            );

            // 🔹 Verificar si tiene al menos uno
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