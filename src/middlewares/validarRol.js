const tieneRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuarioRaw = req.usuario?.rol;
    const rolUsuario = typeof rolUsuarioRaw === 'string'
      ? rolUsuarioRaw.toLowerCase()
      : rolUsuarioRaw?.nombre?.toLowerCase();

    if (!req.usuario) {
      return res.status(500).json({
        mensaje: "Se intenta verificar el rol sin validar el token primero",
      });
    }

    if (!rolesPermitidos.map(r => r.toLowerCase()).includes(rolUsuario)) {
      return res.status(403).json({
        mensaje: `Rol '${rolUsuarioRaw?.nombre || rolUsuarioRaw}' no autorizado. Se requiere uno de: [${rolesPermitidos.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = { tieneRol };
