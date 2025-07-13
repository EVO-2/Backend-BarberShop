const Usuario = require('../models/Usuario.model');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const login = async (req, res) => {
  console.log('📥 req.body:', req.body);
  try {
    const usuario = await Usuario.findOne({ correo: req.body.correo })
      .select('+password')
      .populate('rol', 'nombre'); // ✅ importante para obtener el nombre del rol

    if (!usuario || !usuario.estado) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(req.body.password, usuario.password);
    console.log('¿Contraseña válida?', validPassword);

    if (!validPassword) {
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    // ✅ Validación correcta del rol
    const rolNombre = usuario.rol?.nombre;
    if (!rolNombre) {
      return res.status(500).json({ mensaje: 'No se pudo obtener el rol del usuario' });
    }

    const token = jwt.sign(
      {
        uid: usuario._id,
        rol: rolNombre,
        nombre: usuario.nombre,
        foto: usuario.foto
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { exp } = jwt.decode(token);
    const expDate = new Date(exp * 1000);

    console.log('Token generado:', token);
    console.log('📦 Payload decodificado:', jwt.decode(token));
    console.log('🕒 Token expirará el:', expDate.toLocaleString('es-CO'));

    res.json({
      usuario,
      token,
      expiraEn: expDate
    });

  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
  }
};

module.exports = { login };
