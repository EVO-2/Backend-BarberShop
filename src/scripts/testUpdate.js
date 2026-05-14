const mongoose = require('mongoose');

async function testUpdate() {
  await mongoose.connect('mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP');
  console.log('Connected to DB');

  const empresaDestino = new mongoose.Types.ObjectId('69fab6fb2445f053796b0145');

  const result = await mongoose.connection.db.collection('usuarios').updateMany(
    { $or: [{ empresaId: null }, { empresaId: { $exists: false } }] },
    { $set: { empresaId: empresaDestino } }
  );

  console.log('Update result:', result);

  const usuariosNull = await mongoose.connection.db.collection('usuarios').find({ empresaId: null }).toArray();
  console.log('Usuarios still null:', usuariosNull.length);

  await mongoose.disconnect();
}

testUpdate().catch(console.error);
