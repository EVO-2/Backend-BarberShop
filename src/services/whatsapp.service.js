class WhatsAppService {
    /**
     * Genera un enlace directo de WhatsApp Web/App para enviar un mensaje con un solo clic.
     */
    generarEnlaceWhatsApp(telefono, mensaje) {
        if (!telefono) return null;

        let numeroFormateado = telefono.replace(/\D/g, '');
        if (numeroFormateado.length === 10 && !numeroFormateado.startsWith('57')) {
            numeroFormateado = '57' + numeroFormateado;
        }

        const mensajeCodificado = encodeURIComponent(mensaje);
        return `https://wa.me/${numeroFormateado}?text=${mensajeCodificado}`;
    }

    /**
     * Envía un mensaje de texto de manera programática a través de la API oficial de Meta Cloud.
     * @param {Object} params { telefono, mensaje }
     */
    async enviarMensaje({ telefono, mensaje }) {
        try {
            const url = process.env.WHATSAPP_API_URL;
            const token = process.env.WHATSAPP_TOKEN;

            if (!url || !token) {
                console.warn('⚠️ [WhatsAppService] No se ha configurado WHATSAPP_API_URL o WHATSAPP_TOKEN. El mensaje se imprimirá en consola.');
                console.log(`📱 [WhatsApp Virtual Outbound] Para: ${telefono}\nMensaje:\n${mensaje}`);
                return { success: true, dummy: true };
            }

            // Formatear teléfono a formato numérico puro sin símbolos
            let numeroDestino = telefono.replace(/\D/g, '');
            if (numeroDestino.length === 10 && !numeroDestino.startsWith('57')) {
                numeroDestino = '57' + numeroDestino;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: numeroDestino,
                    type: 'text',
                    text: {
                        body: mensaje
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('❌ [WhatsAppService Error] Respuesta fallida de Meta Cloud:', data);
                return { success: false, error: data };
            }

            console.log(`✅ [WhatsAppService] Mensaje enviado con éxito a ${numeroDestino}. Message ID:`, data.messages?.[0]?.id);
            return { success: true, data };
        } catch (error) {
            console.error('❌ [WhatsAppService Exception] Error al enviar mensaje:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new WhatsAppService();