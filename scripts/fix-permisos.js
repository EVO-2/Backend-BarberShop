const { MongoClient } = require('mongodb');

async function fixPermisos() {
    const localUri = 'mongodb://127.0.0.1:27017/BACKEND-BARBERSHOP?replicaSet=rs0';
    const remoteUri = 'mongodb+srv://EVO:Evo16948788@cluster0.ceahba7.mongodb.net/BACKEND-BARBERSHOP';

    const localClient = new MongoClient(localUri);
    const remoteClient = new MongoClient(remoteUri);

    try {
        await localClient.connect();
        await remoteClient.connect();
        
        const localDb = localClient.db();
        const remoteDb = remoteClient.db();

        // 1. Obtener todos los permisos locales
        const docs = await localDb.collection('permisos').find({}).toArray();
        console.log(`Encontrados ${docs.length} permisos locales.`);

        // 2. Limpiar la colección remota
        await remoteDb.collection('permisos').deleteMany({});
        console.log('Colección permisos remota limpiada.');

        // 3. Arreglar y adaptar los permisos al nuevo Schema
        const fixedDocs = docs.map(doc => {
            // Si no tienen clave, le damos una usando nombre y modulo
            if (!doc.clave) {
                // ej: ver_productos_productos
                doc.clave = `${doc.nombre}_${doc.modulo}`.toLowerCase();
            }
            // Si el schema dice que requiere tipo enum: ['crear', 'leer', 'editar', 'eliminar']
            if (!doc.tipo) {
                if (doc.nombre.includes('crear')) doc.tipo = 'crear';
                else if (doc.nombre.includes('editar') || doc.nombre.includes('actualizar')) doc.tipo = 'editar';
                else if (doc.nombre.includes('eliminar') || doc.nombre.includes('borrar')) doc.tipo = 'eliminar';
                else doc.tipo = 'leer'; // por defecto
            }
            return doc;
        });

        // 4. Insertar en Atlas
        if(fixedDocs.length > 0) {
            await remoteDb.collection('permisos').insertMany(fixedDocs, { ordered: false });
            console.log(`✅ ¡${fixedDocs.length} permisos migrados exitosamente a Atlas!`);
        }
    } catch (e) {
        console.error('🔴 Error migrando permisos:', e);
    } finally {
        await localClient.close();
        await remoteClient.close();
    }
}
fixPermisos();
