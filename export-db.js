const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function dump() {
    const localUri = 'mongodb://127.0.0.1:27017/BACKEND-BARBERSHOP?replicaSet=rs0';
    const client = new MongoClient(localUri);
    const backupDir = path.join(__dirname, 'backup_folder');

    try {
        // Crear la carpeta si no existe
        if (!fs.existsSync(backupDir)){
            fs.mkdirSync(backupDir);
        }

        console.log('Conectando a la base de datos local...');
        await client.connect();
        const db = client.db();
        
        const collections = await db.listCollections().toArray();

        for (let colInfo of collections) {
            const colName = colInfo.name;
            const collection = db.collection(colName);
            
            // Obtener documentos
            const docs = await collection.find({}).toArray();
            
            // Escribir a .json
            const filePath = path.join(backupDir, `${colName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
            
            if (docs.length > 0) {
                console.log(`✅ Colección '${colName}' exportada a backup_folder/${colName}.json (${docs.length} documentos).`);
            } else {
                console.log(`⚠️ Colección '${colName}' estaba vacía, se creó el archivo json sin datos.`);
            }
        }
        console.log('\n🎉 ¡Exportación completada exitosamente a la carpeta ./backup_folder!');
    } catch (e) {
        console.error('🔴 Error durante la exportación:', e);
    } finally {
        await client.close();
    }
}

dump();
