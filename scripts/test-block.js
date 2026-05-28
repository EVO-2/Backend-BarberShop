require('dotenv').config();
const mongoose = require('mongoose');
const Empresa = require('../src/models/Empresa.model');

const bloquearEmpresas = async () => {
  try {
    await mongoose.connect(process.env.DB_CNN || 'mongodb://localhost:27017/barberia-evo2');
    console.log('🔗 Conectado a la BD para la prueba...');

    // Ponemos a todas las empresas en estado vencida
    const resultado = await Empresa.updateMany({}, { $set: { suscripcionEstado: 'vencida' } });
    
    console.log(`✅ ¡Prueba lista! Se han bloqueado ${resultado.modifiedCount} empresas.`);
    console.log('👉 Ahora ve a tu frontend en http://localhost:4200 y navega por cualquier módulo. El sistema debería redirigirte a la pantalla de bloqueo rojo oscuro.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
  }
};

bloquearEmpresas();
