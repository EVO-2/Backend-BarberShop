require('dotenv').config();
const mongoose = require('mongoose');

const dropIndexes = async () => {
  try {
    await mongoose.connect(process.env.DB_CNN || 'mongodb://localhost:27017/barberia-evo2');
    console.log('Conectado a la base de datos...');

    const db = mongoose.connection.db;

    // Drop unique index in roles
    try {
      await db.collection('rols').dropIndex('nombre_1');
      console.log('✅ Índice global "nombre_1" eliminado de la colección roles.');
    } catch (e) {
      console.log('⚠️ Índice "nombre_1" en roles no encontrado o ya eliminado.');
    }

    // Drop unique index in permisos
    try {
      await db.collection('permisos').dropIndex('clave_1');
      console.log('✅ Índice global "clave_1" eliminado de la colección permisos.');
    } catch (e) {
      console.log('⚠️ Índice "clave_1" en permisos no encontrado o ya eliminado.');
    }

    try {
      await db.collection('permisos').dropIndex('nombre_1_modulo_1');
      console.log('✅ Índice "nombre_1_modulo_1" eliminado de la colección permisos.');
    } catch (e) {
      console.log('⚠️ Índice "nombre_1_modulo_1" en permisos no encontrado o ya eliminado.');
    }

    console.log('🎉 Finalizado.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropIndexes();
