require('dotenv').config();

const mongoose = require('mongoose');

const conectarDB = async () => {
  console.log('📦 URI:', process.env.MONGODB_URI); 

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`🟢 Conexión a MongoDB exitosa: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('🔴 Error al conectar con MongoDB', error);
    process.exit(1);
  }
};

module.exports = conectarDB;
