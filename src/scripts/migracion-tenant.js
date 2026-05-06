const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Cita = require('../models/Cita.model');
const Sede = require('../models/Sede.model');
const Peluquero = require('../models/Peluquero.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Usuario = require('../models/Usuario.model');
const Cliente = require('../models/Cliente.model');
const Servicio = require('../models/Servicio.model');
const Pago = require('../models/Pago.model');
const HistorialAcceso = require('../models/HistorialAcceso.model');

async function migrateData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BACKEND-BARBERSHOP');
    console.log('✅ Conectado a MongoDB para la migración');

    // 1. Obtener la empresa principal (la que nos pasaste en el error)
    const Empresa = require('../models/Empresa.model');
    const empresaPrincipal = await Empresa.findOne({ email: 'admin@barbershop.com' });
    
    if (!empresaPrincipal) {
      console.log('❌ No se encontró la empresa principal. Abortando migración.');
      process.exit(1);
    }
    const empresaId = empresaPrincipal._id;
    console.log(`🏢 Empresa principal encontrada: ${empresaPrincipal.nombre} (${empresaId})`);

    // 2. Función de ayuda para actualizar modelos
    const updateModel = async (Model, modelName) => {
      console.log(`\n⏳ Migrando ${modelName}...`);
      
      // Buscar documentos sin empresaId
      const count = await Model.collection.countDocuments({
        $or: [{ empresaId: null }, { empresaId: { $exists: false } }]
      });
      
      if (count === 0) {
        console.log(`✅ ${modelName}: No hay registros pendientes de migración.`);
        return;
      }

      console.log(`   Se encontraron ${count} registros sin empresaId.`);
      
      // Actualizar usando la colección nativa para evitar plugins o middlewares
      const result = await Model.collection.updateMany(
        { $or: [{ empresaId: null }, { empresaId: { $exists: false } }] },
        { $set: { empresaId: empresaId } }
      );
      
      console.log(`✅ ${modelName}: Se actualizaron ${result.modifiedCount} registros exitosamente.`);
    };

    // 3. Migrar todas las colecciones relevantes
    await updateModel(Sede, 'Sedes');
    await updateModel(Peluquero, 'Peluqueros');
    await updateModel(PuestoTrabajo, 'Puestos de Trabajo');
    await updateModel(Usuario, 'Usuarios');
    await updateModel(Cliente, 'Clientes');
    await updateModel(Servicio, 'Servicios');
    await updateModel(Cita, 'Citas');
    await updateModel(Pago, 'Pagos');
    await updateModel(HistorialAcceso, 'Historial de Acceso');

    console.log('\n🎉 ¡Migración completada exitosamente! Todos los datos antiguos ahora pertenecen a la Empresa Principal.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateData();
