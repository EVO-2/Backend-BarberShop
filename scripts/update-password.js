const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const Usuario = require('../src/models/Usuario.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const usuarioAislado = await Usuario.findOne({ correo: 'aislado@vip.com' });
    
    if (usuarioAislado) {
      usuarioAislado.password = 'Admin123*'; // Cumple con mayúscula, minúscula, número y carácter especial
      await usuarioAislado.save();
      console.log('✅ Contraseña actualizada a Admin123*');
    } else {
      console.log('❌ No se encontró al usuario');
    }

    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error:', err);
    mongoose.disconnect();
  });
