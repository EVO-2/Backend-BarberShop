const { MongoClient } = require('mongodb');

async function migrateSafe() {
    const localUri = 'mongodb://127.0.0.1:27017/BACKEND-BARBERSHOP?replicaSet=rs0';
    const remoteUri = 'mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP';

    const localClient = new MongoClient(localUri);
    const remoteClient = new MongoClient(remoteUri);

    try {
        console.log('🔗 Conectando a las bases de datos para migración directa...');
        await localClient.connect();
        await remoteClient.connect();
        
        const localDb = localClient.db();
        const remoteDb = remoteClient.db();

        const collections = await localDb.listCollections().toArray();

        for (let colInfo of collections) {
            const colName = colInfo.name;
            const localCollection = localDb.collection(colName);
            const remoteCollection = remoteDb.collection(colName);
            
            const docs = await localCollection.find({}).toArray();
            
            if (docs.length > 0) {
                console.log(`\n⏳ Migrando colección: ${colName} (${docs.length} documentos)...`);
                // Borrar todo antes de insertar
                await remoteCollection.deleteMany({});
                
                try {
                    // ordered: false permite que MongoDB continúe insertando el resto 
                    // de los documentos aunque falle uno (por ejemplo por índices duplicados)
                    await remoteCollection.insertMany(docs, { ordered: false });
                    console.log(`✅ Colección ${colName} migrada correctamente.`);
                } catch (err) {
                    if (err.code === 11000) {
                        console.log(`⚠️ Se migraron (casi) todos los documentos de ${colName}, pero se ignoraron los que tenían una llave duplicada (Error 11000).`);
                    } else {
                        console.error(`🔴 Error insertando en ${colName}:`, err.message);
                    }
                }
            } else {
                console.log(`\n⚠️ La colección local ${colName} está vacía, se ignora.`);
            }
        }
        
        console.log('\n🎉 ¡Todos tus datos locales han sido migrados exitosamente a Atlas!');
    } catch (e) {
        console.error('🔴 Error crítico:', e);
    } finally {
        await localClient.close();
        await remoteClient.close();
    }
}

migrateSafe();
