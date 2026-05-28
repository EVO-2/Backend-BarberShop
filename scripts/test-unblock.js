require('dotenv').config();
const mongoose = require('mongoose');
const Empresa = require('../src/models/Empresa.model');

const desbloquearEmpresas = async () => {
  try {
    await mongoose.connect(process.env.DB_CNN || 'mongodb://localhost:27017/barberia-evo2');
    console.log('🔗 Conectado a la BD para restaurar...');

    // Ponemos a todas las empresas en estado activa
    const resultado = await Empresa.updateMany({}, { $set: { suscripcionEstado: 'activa' } });
    
    console.log(`✅ ¡Prueba finalizada! Se han restaurado a activas ${resultado.modifiedCount} empresas.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

desbloquearEmpresas();
