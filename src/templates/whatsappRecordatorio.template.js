const generarMensajeRecordatorio = (data) => {
    return `💈 Barbería JEVO

Hola ${data.nombre} 👋

⏰ Te recordamos tu cita:

📅 ${data.fecha}
🕒 ${data.hora}
💇 ${data.servicio}

🔗 ${data.url}

¡Te esperamos!`;
};

module.exports = generarMensajeRecordatorio;