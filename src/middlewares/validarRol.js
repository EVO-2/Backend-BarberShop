const tieneRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.rol) {
      return res.status(500).json({ mensaje: 'Se requiere validar el token primero' });
    }

    if (!rolesPermitidos.includes(req.rol)) {
      return res.status(403).json({ mensaje: `Rol ${req.rol} no autorizado` });
    }

    next();
  };
};

module.exports = tieneRol;
