const tieneRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = req.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        mensaje: `🛑 Rol '${rolUsuario}' no autorizado. Se requiere uno de: [${rolesPermitidos.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = {
  tieneRol,
};
