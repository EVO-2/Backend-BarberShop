class WhatsAppService {
    /**
     * Genera un enlace directo de WhatsApp Web/App para enviar un mensaje con un solo clic.
     * Esto no requiere ninguna API ni pagos, funciona con la API nativa de enlaces de WhatsApp.
     */
    generarEnlaceWhatsApp(telefono, mensaje) {
        if (!telefono) return null;

        // Formatear el teléfono (quitar espacios, símbolos y asegurar el código de país, asumiendo +57 si no hay)
        let numeroFormateado = telefono.replace(/\D/g, '');
        if (numeroFormateado.length === 10 && !numeroFormateado.startsWith('57')) {
            numeroFormateado = '57' + numeroFormateado; // Asumimos Colombia si envían 10 dígitos sin el +57
        }

        // Codificar el mensaje para la URL
        const mensajeCodificado = encodeURIComponent(mensaje);
        const link = `https://wa.me/${numeroFormateado}?text=${mensajeCodificado}`;

        return link;
    }
}

module.exports = new WhatsAppService();