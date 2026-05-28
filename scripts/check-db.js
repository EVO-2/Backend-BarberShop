const { MongoClient } = require('mongodb');

async function check() {
    const localUri = 'mongodb://127.0.0.1:27017/BACKEND-BARBERSHOP?replicaSet=rs0';
    const remoteUri = 'mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP';

    const localClient = new MongoClient(localUri);
    const remoteClient = new MongoClient(remoteUri);

    try {
        await localClient.connect();
        await remoteClient.connect();
        
        const localDb = localClient.db();
        const remoteDb = remoteClient.db();

        console.log('--- COMPARANDO CONTEO DE DOCUMENTOS ---');
        const collections = ['citas', 'permisos', 'usuarios'];

        for (let col of collections) {
            const localCount = await localDb.collection(col).countDocuments();
            const remoteCount = await remoteDb.collection(col).countDocuments();
            console.log(`${col.padEnd(10)} | Local: ${localCount} | Atlas: ${remoteCount}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await localClient.close();
        await remoteClient.close();
    }
}

check();
