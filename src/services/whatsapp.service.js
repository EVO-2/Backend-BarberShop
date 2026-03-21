const axios = require('axios');

class WhatsAppService {
    async enviarMensaje({ telefono, mensaje }) {
        try {
            if (!telefono) return;

            console.log(`📱 Enviando WhatsApp a ${telefono}...`);

            // 🔥 EJEMPLO (Meta WhatsApp API o proveedor)
            await axios.post(process.env.WHATSAPP_API_URL, {
                to: telefono,
                message: mensaje
            }, {
                headers: {
                    Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`
                }
            });

            console.log(`📱 WhatsApp enviado a ${telefono}`);
        } catch (error) {
            console.error('❌ Error enviando WhatsApp:', error.message);
        }
    }
}

module.exports = new WhatsAppService();