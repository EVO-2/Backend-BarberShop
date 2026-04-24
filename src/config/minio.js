const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// 🔹 Nombre del bucket centralizado
const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || 'backend-barbershop';

const accessKeyId = process.env.MINIO_ACCESS_KEY ? process.env.MINIO_ACCESS_KEY.trim() : undefined;
const secretAccessKey = process.env.MINIO_SECRET_KEY ? process.env.MINIO_SECRET_KEY.trim() : undefined;
const endpointVal = process.env.MINIO_ENDPOINT ? process.env.MINIO_ENDPOINT.trim() : undefined;

console.error("🔍 Variables de MinIO detectadas por Node.js:", Object.keys(process.env).filter(key => key.startsWith('MINIO_')));

if (!accessKeyId || !secretAccessKey) {
    throw new Error('❌ ERROR FATAL: MINIO_ACCESS_KEY o MINIO_SECRET_KEY no están definidos en Railway. Revisa la pestaña de variables.');
}

// 🔹 Cliente S3 compatible con MinIO
const s3Client = new S3Client({
    region: 'us-east-1', // Requisito del SDK
    credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
    },
    endpoint: endpointVal 
        ? `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${endpointVal}${process.env.MINIO_PORT && process.env.MINIO_PORT !== '443' && process.env.MINIO_PORT !== '80' ? ':' + process.env.MINIO_PORT.trim() : ''}`
        : undefined,
    forcePathStyle: true, // 🔴 OBLIGATORIO para MinIO
});

// 🔹 Utilidad para eliminar imágenes del Bucket
const eliminarArchivoMinio = async (fileUrl) => {
    if (!fileUrl) return;

    try {
        // Validar que sea una URL válida
        let urlObj;
        try {
            urlObj = new URL(fileUrl);
        } catch (err) {
            console.warn('⚠️ URL inválida, no se elimina archivo:', fileUrl);
            return;
        }

        // Ejemplo:
        // https://dominio/bucket/perfiles/imagen.jpg
        // pathname: /bucket/perfiles/imagen.jpg
        let key = urlObj.pathname.substring(1); // quita el "/"

        // 🔹 Remover bucket si viene incluido en el path
        if (key.startsWith(`${BUCKET_NAME}/`)) {
            key = key.replace(`${BUCKET_NAME}/`, '');
        }

        // 🔹 Validación extra
        if (!key || key.trim() === '') {
            console.warn('⚠️ Key vacío, no se elimina archivo');
            return;
        }

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
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
    eliminarArchivoMinio,
    BUCKET_NAME,
};