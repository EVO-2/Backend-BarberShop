const generarMensajeRecordatorio = (data) => {
    return `💈 Cristian BarberShop

Hola ${data.nombre} 👋

⏰ Te recordamos tu cita:

📅 ${data.fecha}
🕒 ${data.hora}
💇 ${data.servicio}

🔗 ${data.url}

¡Te esperamos!`;
};

module.exports = generarMensajeRecordatorio;