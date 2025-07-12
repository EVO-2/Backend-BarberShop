const Usuario = require('../models/Usuario.model');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const login = async (req, res) => {
  try {
    // 1. Buscar usuario y traer password
    const usuario = await Usuario.findOne({ correo: req.body.correo }).select('+password');
    //console.log('Usuario encontrado:', usuario);

    if (!usuario || !usuario.estado) {
      return res.status(400).json({ mensaje: 'Credenciales inválidas' });
    }

    // 2. Verificar contraseña
    const validPassword = await bcrypt.compare(req.body.password, usuario.password);
    console.log('¿Contraseña válida?', validPassword);

    if (!validPassword) {
      return res.status(400).json({ mensaje: 'Contraseña incorrecta' });
    }

    // 3. Generar token (10 s solo para pruebas)
    const token = jwt.sign(
  {
    uid: usuario._id,
    rol: usuario.rol,
    nombre: usuario.nombre,
    foto: usuario.foto 
  },
  process.env.JWT_SECRET,
  { expiresIn: '8h' }
);


    // 4. Decodificar para obtener fecha de expiración
    const { exp } = jwt.decode(token);          // exp en segundos UNIX
    const expDate = new Date(exp * 1000);       // convertir a milisegundos

    console.log('🕒 Token expirará el:', expDate.toLocaleString('es-CO'));

    // 5. Respuesta al frontend
    res.json({
      usuario,
      token,
      expiraEn: expDate            // opcional: el frontend puede mostrarla
    });

  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
  }
};

module.exports = { login };
