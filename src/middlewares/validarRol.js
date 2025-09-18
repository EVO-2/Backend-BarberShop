const tieneRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(500).json({
        mensaje: "Se intenta verificar el rol sin validar el token primero",
      });
    }

    const rolUsuarioRaw = req.usuario?.rol;
    const rolUsuario = typeof rolUsuarioRaw === 'string'
      ? rolUsuarioRaw.toLowerCase()
      : rolUsuarioRaw?.nombre?.toLowerCase();

    // Normalizar roles permitidos
    const rolesNormalizados = rolesPermitidos.map(r => r.toLowerCase());

    // 🔹 Excepción: permitir acceso a /peluqueros/disponibles a clientes y admins
    if (req.originalUrl?.startsWith('/api/peluqueros/disponibles')) {
      if (rolUsuario === 'cliente' || rolUsuario === 'admin') {
        return next();
      }
    }

    // Verificación normal
    if (!rolesNormalizados.includes(rolUsuario)) {
      return res.status(403).json({
        mensaje: `Rol '${rolUsuarioRaw?.nombre || rolUsuarioRaw}' no autorizado. Se requiere uno de: [${rolesPermitidos.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = { tieneRol };
