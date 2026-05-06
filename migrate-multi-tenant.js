const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const modelsDir = path.join(__dirname, 'src', 'models');
const Empresa = require('./src/models/Empresa.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('📦 Conectado a MongoDB para la migración Multi-Tenant');

    // 1. Crear la empresa principal si no existe
    let empresaPrincipal = await Empresa.findOne({ nombre: 'BARBERSHOP PRINCIPAL' });
    
    if (!empresaPrincipal) {
      empresaPrincipal = await Empresa.create({
        nombre: 'BARBERSHOP PRINCIPAL',
        direccion: 'Dirección por defecto',
        telefono: '0000000',
        email: 'admin@barbershop.com'
      });
      console.log('🏢 Empresa principal creada:', empresaPrincipal._id);
    } else {
      console.log('🏢 Empresa principal ya existe:', empresaPrincipal._id);
    }

    // 2. Leer todos los modelos y actualizar los registros
    const files = fs.readdirSync(modelsDir);
    
    for (const file of files) {
      if (file === 'Empresa.model.js') continue;
      
      try {
        const Model = require(path.join(modelsDir, file));
        
        // Verifica si Model es realmente un modelo de Mongoose
        if (Model && Model.modelName) {
          const result = await Model.updateMany(
            { empresaId: null }, // Busca los que no tienen empresaId o lo tienen null
            { $set: { empresaId: empresaPrincipal._id } }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`✅ ${file.padEnd(25)} -> ${result.modifiedCount} registros migrados.`);
          } else {
            console.log(`⚡ ${file.padEnd(25)} -> Al día.`);
          }
        }
      } catch (err) {
        console.error(`❌ Error migrando ${file}:`, err.message);
      }
    }

    console.log('🎉 Migración Multi-Tenant completada exitosamente.');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ Error al conectar a MongoDB:', err);
    mongoose.disconnect();
  });
