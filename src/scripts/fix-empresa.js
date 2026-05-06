const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Empresa = require('../models/Empresa.model');
const Sede = require('../models/Sede.model');
const Cita = require('../models/Cita.model');
const Peluquero = require('../models/Peluquero.model');
const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Cliente = require('../models/Cliente.model');
const Servicio = require('../models/Servicio.model');

async function fixEmpresaPrincipal() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BACKEND-BARBERSHOP');
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;

    const idSedeReal = new mongoose.Types.ObjectId('69e820bfa139ddc0483a92c4');
    const idEmpresa = new mongoose.Types.ObjectId('69fab6fb2445f053796b0145');

    // 1. Obtener la Sede que tiene los datos reales
    const sedeReal = await db.collection('sedes').findOne({ _id: idSedeReal });
    if (!sedeReal) {
      console.log('❌ No se encontró la Sede CRISTIAN BARBERSHOP.');
      process.exit(1);
    }

    console.log(`📌 Sede Real encontrada: ${sedeReal.nombre}`);

    // 2. Actualizar la Empresa Principal con los datos de esta sede
    await db.collection('empresas').updateOne(
      { _id: idEmpresa },
      {
        $set: {
          nombre: sedeReal.nombre, // "CRISTIAN BARBERSHOP"
          direccion: sedeReal.direccion,
          telefono: sedeReal.telefono,
          updatedAt: new Date()
        }
      }
    );
    console.log(`✅ Empresa Principal (${idEmpresa}) actualizada con los datos de ${sedeReal.nombre}.`);

    // 3. Asegurar que la Sede apunte a la Empresa Principal
    await db.collection('sedes').updateOne(
      { _id: idSedeReal },
      { $set: { empresaId: idEmpresa } }
    );

    // 4. Limpiar datos de prueba (opcional pero seguro)
    // El usuario dijo "lo demas pienso limpiarlo", pero para no romper la lógica, 
    // nos aseguramos que TODO lo que pertenece a esta Sede tenga el empresaId correcto.
    const collections = ['citas', 'peluqueros', 'puestos_trabajo', 'servicios'];
    
    for (const collName of collections) {
      // Garantizar que los registros de la sede real apunten a la empresa real
      const res = await db.collection(collName).updateMany(
        { sede: idSedeReal },
        { $set: { empresaId: idEmpresa } }
      );
      if (res.modifiedCount > 0) {
        console.log(`✅ Vinculados ${res.modifiedCount} registros de '${collName}' a la Empresa Principal.`);
      }
    }

    // Para los clientes (que usualmente se asocian a la empresa y no a la sede en algunos modelos)
    // Nos aseguramos que al menos no queden volando si no tienen empresaId
    await db.collection('clientes').updateMany(
      { $or: [{ empresaId: null }, { empresaId: { $exists: false } }] },
      { $set: { empresaId: idEmpresa } }
    );

    console.log('\n🎉 ¡Estructura corregida exitosamente!');
    console.log('Ahora "CRISTIAN BARBERSHOP" es la empresa principal en el sistema y toda su información está conectada lógicamente.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixEmpresaPrincipal();
