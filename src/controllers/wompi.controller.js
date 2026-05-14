const crypto = require('crypto');
const Empresa = require('../models/Empresa.model');
const HistorialAcceso = require('../models/HistorialAcceso.model'); // Reutilizamos historial para logs
const mongoose = require('mongoose');

// Wompi Test Keys (Deben ir en .env)
const WOMPI_PUB_KEY = process.env.WOMPI_PUB_KEY || 'pub_test_Q5yDA9xoKdePzhSGeZaAWGJCZ2m3kALi';
const WOMPI_PRV_KEY = process.env.WOMPI_PRV_KEY || 'prv_test_V0PqzYQvXf8yv1YyH8j7KxM0TzH';
const WOMPI_INTEGRITY_SECRET = process.env.WOMPI_INTEGRITY_SECRET || 'test_integrity_secret_12345';

// 1. Obtener la llave pública (para el frontend)
const getWompiKeys = (req, res) => {
  res.json({
    publicKey: WOMPI_PUB_KEY
  });
};

// 2. Generar Firma de Integridad (SHA256)
const generarFirma = (req, res) => {
  try {
    const { referencia, monto_en_centavos, moneda } = req.body;

    if (!referencia || !monto_en_centavos || !moneda) {
      return res.status(400).json({ msg: 'Faltan datos para la firma' });
    }

    // Cadena a firmar: referencia + monto_en_centavos + moneda + integrity_secret
    const cadena = `${referencia}${monto_en_centavos}${moneda}${WOMPI_INTEGRITY_SECRET}`;
    
    // Generar SHA256
    const hash = crypto.createHash('sha256').update(cadena).digest('hex');

    res.json({ firma: hash });
  } catch (error) {
    res.status(500).json({ msg: 'Error al generar la firma' });
  }
};

// 3. Webhook de Wompi (Para confirmar pagos en segundo plano)
const webhookWompi = async (req, res) => {
  try {
    const evento = req.body;

    // Verificar que sea un evento de transacción actualizada
    if (evento.event !== 'transaction.updated') {
      return res.status(200).send('Ignorado');
    }

    const { data, signature } = evento;
    const transaccion = data.transaction;

    // TODO: Verificar firma de integridad del Webhook para seguridad (Events Signature)
    // properties: transaccion.id + transaccion.status + transaccion.amount_in_cents + timestamp + secret

    if (transaccion.status === 'APPROVED') {
      // Extraer datos
      const referencia = transaccion.reference; // ej. SUB-69fab6fb2445f053796b0145-12345
      
      if (!referencia.startsWith('SUB-')) {
        return res.status(200).send('No es una suscripción');
      }

      const empresaId = referencia.split('-')[1];

      // Actualizar la empresa
      const fechaActual = new Date();
      fechaActual.setDate(fechaActual.getDate() + 30); // Añade 30 días de acceso

      await Empresa.findByIdAndUpdate(empresaId, {
        suscripcionEstado: 'activa',
        fechaProximoCobro: fechaActual,
        pasarelaClienteId: transaccion.customer_email
      });

      console.log(`✅ [Wompi Webhook] Pago aprobado para empresa: ${empresaId}. Acceso extendido 30 días.`);
    } else {
      console.log(`❌ [Wompi Webhook] Transacción fallida o declinada: ${transaccion.status}`);
    }

    res.status(200).send('Webhook recibido');

  } catch (error) {
    console.error('❌ Error en Webhook Wompi:', error);
    res.status(500).send('Error');
  }
};

module.exports = {
  getWompiKeys,
  generarFirma,
  webhookWompi
};
