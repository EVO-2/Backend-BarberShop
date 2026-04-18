const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const s3Client = new S3Client({
    region: 'us-east-1', // Requisito de AWS SDK (MinIO lo ignora si no está configurado)
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    // Construye el Endpoint con o sin puerto dependiendo de cómo se envíe, 
    // en easypanel usualmente 443 no hace falta especificarlo en la URL si HTTPS es estándar, pero lo uniremos.
    endpoint: `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${process.env.MINIO_ENDPOINT}${process.env.MINIO_PORT === '443' || process.env.MINIO_PORT === '80' ? '' : ':' + process.env.MINIO_PORT}`,
    forcePathStyle: true, // Esto es OBLIGATORIO para MinIO u otros S3 compatibles
});

// Utilidad para eliminar imágenes del Bucket cuando se actualicen o borren registros
const eliminarArchivoMinio = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        // fileUrl usualmente es: https://[endpoint]/[bucket]/ruta/al/archivo.jpg
        const urlObj = new URL(fileUrl);
        const bucketName = process.env.MINIO_BUCKET_NAME;

        // Limpiar el pathname (ej. "/BACKEND-BARBERSHOP/servicios/foto.jpg" -> "BACKEND-BARBERSHOP/servicios/foto.jpg")
        let key = urlObj.pathname.substring(1); 
        
        // Quitar el nombre del bucket al inicio si existe en el path
        if (key.startsWith(`${bucketName}/`)) {
            key = key.replace(`${bucketName}/`, '');
        }

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        await s3Client.send(command);
        console.log(`🗑️ Archivo eliminado de MinIO: ${key}`);
    } catch (error) {
        console.error('⚠️ Error eliminando archivo de MinIO:', error.message);
    }
};

module.exports = {
    s3Client,
    eliminarArchivoMinio
};
