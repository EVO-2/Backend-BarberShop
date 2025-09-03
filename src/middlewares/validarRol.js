const tieneRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuarioRaw = req.usuario?.rol;
    const rolUsuario = typeof rolUsuarioRaw === 'string'
      ? rolUsuarioRaw.toLowerCase()
      : rolUsuarioRaw?.nombre?.toLowerCase(); // 👈 si es objeto, usa .nombre

    console.log("🟢 Rol normalizado:", rolUsuario, " | Roles permitidos:", rolesPermitidos);
    console.log("👉 tieneRol ejecutado. RolesPermitidos:", rolesPermitidos, "RolUsuario:", rolUsuario);

    if (!req.usuario) {
      return res.status(500).json({
        mensaje: "❌ Se intenta verificar el rol sin validar el token primero",
      });
    }

    // 🔎 Comparamos insensiblemente
    if (!rolesPermitidos.map(r => r.toLowerCase()).includes(rolUsuario)) {
      return res.status(403).json({
        mensaje: `🛑 Rol '${rolUsuarioRaw?.nombre || rolUsuarioRaw}' no autorizado. Se requiere uno de: [${rolesPermitidos.join(', ')}]`
      });
    }

    next();
  };
};

module.exports = { tieneRol };
