const tieneRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    const rolUsuario = req.rol;

    /*console.log('🔒 Verificando rol...');
    console.log('👤 Rol del usuario:', rolUsuario);
    console.log('✅ Roles permitidos:', rolesPermitidos);*/

    if (!rolesPermitidos.includes(rolUsuario)) {
      //console.warn(`🛑 Acceso denegado para el rol '${rolUsuario}'`);
      return res.status(403).json({
        mensaje: `🛑 Rol '${rolUsuario}' no autorizado. Se requiere uno de: [${rolesPermitidos.join(', ')}]`
      });
    }

    //console.log('🔓 Acceso concedido');
    next();
  };
};

module.exports = {
  tieneRol,
};
