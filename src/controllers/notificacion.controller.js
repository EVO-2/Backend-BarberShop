const Usuario = require('../models/Usuario.model');
const webpush = require('web-push');

// Configuración de web-push con las llaves VAPID (solo si existen para evitar crasheos en entornos sin configurar)
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:soporte@barbershop.com', // Puede ser cualquier correo
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ No se han configurado las llaves VAPID (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). Las notificaciones Web Push están deshabilitadas.');
}

// ===================== Suscribir a Web Push =====================
const suscribir = async (req, res) => {
  try {
    const suscripcion = req.body;
    const usuarioId = req.usuario.id;

    if (!suscripcion || !suscripcion.endpoint) {
      return res.status(400).json({ status: false, message: 'Suscripción inválida' });
    }

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return res.status(404).json({ status: false, message: 'Usuario no encontrado' });
    }

    // Evitar duplicados (chequear por endpoint)
    const existe = usuario.suscripcionesPush.some(sub => sub.endpoint === suscripcion.endpoint);
    
    if (!existe) {
      usuario.suscripcionesPush.push(suscripcion);
      await usuario.save();
    }

    res.status(200).json({ status: true, message: 'Suscripción guardada correctamente' });

  } catch (error) {
    console.error('❌ Error al suscribirse a push:', error);
    res.status(500).json({ status: false, message: 'Error en el servidor al suscribirse' });
  }
};

// ===================== Obtener Clave Pública =====================
const getPublicKey = (req, res) => {
  res.status(200).json({
    status: true,
    publicKey: process.env.VAPID_PUBLIC_KEY
  });
};

module.exports = {
  suscribir,
  getPublicKey
};
