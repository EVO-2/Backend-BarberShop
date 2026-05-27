const WhatsAppSession = require('../models/WhatsAppSession.model');
const Empresa = require('../models/Empresa.model');
const Sede = require('../models/Sede.model');
const Servicio = require('../models/Servicio.model');
const Usuario = require('../models/Usuario.model');
const SedePuesto = require('../models/PuestoTrabajo.model'); // o PuestoTrabajo
const Cita = require('../models/Cita.model');
const Cliente = require('../models/Cliente.model');
const WhatsAppService = require('../services/whatsapp.service');

/**
 * 1. VERIFICACIÓN DEL WEBHOOK DE META (GET)
 */
const verificarWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'StyleManagerJevoWebhookToken';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ [WhatsApp Webhook] Webhook verificado correctamente por Meta.');
      return res.status(200).send(challenge);
    } else {
      console.warn('❌ [WhatsApp Webhook] Error en verificación: Tokens no coinciden.');
      return res.status(403).send('Forbidden');
    }
  } catch (error) {
    console.error('❌ [WhatsApp Webhook Verification Exception]', error);
    return res.status(500).send('Error');
  }
};

/**
 * 2. PROCESAMIENTO DE MENSAJES (POST)
 */
const recibirMensaje = async (req, res) => {
  try {
    const body = req.body;

    // Acusar recibo a Meta inmediatamente para evitar reintentos duplicados
    res.status(200).send('EVENT_RECEIVED');

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Ignorar si no es un evento de mensaje entrante de texto
    if (!message || message.type !== 'text') {
      return;
    }

    const telefonoCliente = message.from;
    const nombreCliente = value.contacts?.[0]?.profile?.name || 'Cliente';
    const textoMensaje = message.text.body.trim();
    const numeroBarberia = value.metadata?.display_phone_number || '';

    console.log(`📱 [WhatsApp Recibido] De: ${telefonoCliente} (${nombreCliente}) | Mensaje: "${textoMensaje}" | Línea: ${numeroBarberia}`);

    // ==========================================
    // 🏢 IDENTIFICAR TENANT (EMPRESA MULTI-SAAS)
    // ==========================================
    let empresa = await Empresa.findOne({ telefono: { $regex: new RegExp(numeroBarberia.replace(/\D/g, ''), 'i') } });
    
    if (!empresa) {
      // Failsafe / Sandbox Test Fallback: Buscar la primera empresa activa en el sistema para facilitar pruebas del desarrollador
      empresa = await Empresa.findOne({ plan: 'premium', suscripcionEstado: 'trial' })
             || await Empresa.findOne({ plan: 'premium', suscripcionEstado: 'activa' })
             || await Empresa.findOne();
    }

    if (!empresa) {
      console.warn('❌ [WhatsApp Bot] Ninguna empresa configurada en la base de datos.');
      return;
    }

    // Verificar si la empresa tiene habilitado el Bot de WhatsApp en su suscripción
    if (empresa.plan !== 'premium' && empresa.suscripcionEstado !== 'trial') {
      console.log(`ℹ️ [WhatsApp Bot] Empresa "${empresa.nombre}" no cuenta con Bot de WhatsApp en su plan actual.`);
      return;
    }

    // ==========================================
    // ⚙️ CARGAR O INICIALIZAR SESIÓN DEL CLIENTE
    // ==========================================
    let session = await WhatsAppSession.findOne({ telefono: telefonoCliente, empresaId: empresa._id });

    if (!session) {
      session = new WhatsAppSession({
        telefono: telefonoCliente,
        empresaId: empresa._id,
        pasoActual: 'INICIO',
        datosCita: {}
      });
      await session.save();
    } else {
      // Extender expiración de la sesión activa
      session.expiration = new Date(Date.now() + 3600 * 1000);
    }

    // Palabras clave globales para reiniciar el flujo
    const comando = textoMensaje.toLowerCase();
    if (['menu', 'hola', 'cancelar', 'reiniciar', 'salir', 'agendar'].includes(comando) && session.pasoActual !== 'INICIO') {
      session.pasoActual = 'INICIO';
      session.datosCita = {};
      await session.save();
    }

    // ==========================================
    // 🧠 MÁQUINA DE ESTADOS CONVERSACIONAL (BOT)
    // ==========================================
    switch (session.pasoActual) {
      case 'INICIO':
        await procesarInicio(session, empresa, textoMensaje, telefonoCliente, nombreCliente);
        break;
      case 'SELECT_SEDE':
        await procesarSelectSede(session, empresa, textoMensaje, telefonoCliente);
        break;
      case 'SELECT_SERVICIO':
        await procesarSelectServicio(session, empresa, textoMensaje, telefonoCliente);
        break;
      case 'SELECT_PELUQUERO':
        await procesarSelectPeluquero(session, empresa, textoMensaje, telefonoCliente);
        break;
      case 'SELECT_FECHA':
        await procesarSelectFecha(session, empresa, textoMensaje, telefonoCliente);
        break;
      case 'SELECT_HORA':
        await procesarSelectHora(session, empresa, textoMensaje, telefonoCliente);
        break;
      case 'CONFIRMACION':
        await procesarConfirmacion(session, empresa, textoMensaje, telefonoCliente, nombreCliente);
        break;
      default:
        session.pasoActual = 'INICIO';
        await session.save();
        await enviarMenuPrincipal(telefonoCliente, empresa.nombre, nombreCliente);
    }

  } catch (error) {
    console.error('❌ [WhatsApp Webhook Exception]', error);
  }
};

/**
 * =========================================================================
 * ⚙️ FLUX PROCESSING METHODS
 * =========================================================================
 */

// 1. INICIO
async function procesarInicio(session, empresa, texto, telefono, nombre) {
  const input = texto.toLowerCase();

  // Si dice 1 o quiere agendar
  if (input === '1' || input.includes('agendar') || input.includes('reserva') || input.includes('cita')) {
    // Buscar sedes
    const sedes = await Sede.find({ empresa: empresa._id, estado: true });
    if (sedes.length === 0) {
      await WhatsAppService.enviarMensaje({
        telefono,
        mensaje: '❌ Lo sentimos, no hay sucursales disponibles en este momento. Inténtalo más tarde.'
      });
      return;
    }

    if (sedes.length === 1) {
      // Saltar al paso del servicio si solo hay 1 sede
      session.datosCita = { sedeId: sedes[0]._id.toString() };
      session.pasoActual = 'SELECT_SERVICIO';
      await session.save();
      await enviarListaServicios(telefono, empresa._id);
    } else {
      session.pasoActual = 'SELECT_SEDE';
      await session.save();
      
      let msg = `📍 *Paso 1/5: Selecciona la Sucursal*\n\nResponde únicamente con el número de la sede:\n\n`;
      sedes.forEach((s, idx) => {
        msg += `${idx + 1}️⃣ *${s.nombre}*\nDirección: ${s.direccion || 'No disponible'}\n\n`;
      });
      msg += `✍️ Escribe *cancelar* en cualquier momento para salir.`;
      await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
    }
  } 
  // Si dice 2 o quiere ver citas
  else if (input === '2' || input.includes('ver citas') || input.includes('mis citas')) {
    let msg = `🔎 *Tus próximas citas:* \n\n`;
    
    // Buscar citas activas por número de teléfono
    const cliente = await Cliente.findOne({ telefono: { $regex: new RegExp(telefono.slice(-10), 'i') } });
    if (!cliente) {
      msg = `No tienes citas agendadas próximamente con nosotros.`;
    } else {
      const citas = await Cita.find({ cliente: cliente._id, estado: { $nin: ['cancelada', 'realizada'] } })
        .populate('sede')
        .populate('peluquero')
        .populate('servicios')
        .sort({ fecha: 1 })
        .limit(3);

      if (citas.length === 0) {
        msg = `No tienes citas pendientes agendadas próximamente.`;
      } else {
        citas.forEach((c, idx) => {
          const fechaCita = new Date(c.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
          const serviciosStr = c.servicios.map(s => s.nombre).join(', ');
          msg += `${idx + 1}️⃣ *${fechaCita} - ${c.hora}*\n📍 Sede: ${c.sede?.nombre || 'Sede principal'}\n✂ Servicios: ${serviciosStr}\n💈 Barbero: ${c.peluquero?.nombre || 'Asignado'}\n\n`;
        });
      }
    }
    
    await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
    await enviarMenuPrincipal(telefono, empresa.nombre, nombre);
  }
  // Si dice 3 o quiere cancelar citas
  else if (input === '3' || input.includes('cancelar cita')) {
    // Buscar citas activas
    const cliente = await Cliente.findOne({ telefono: { $regex: new RegExp(telefono.slice(-10), 'i') } });
    if (!cliente) {
      await WhatsAppService.enviarMensaje({
        telefono,
        mensaje: 'No encontramos ninguna cita registrada bajo tu número de contacto.'
      });
      await enviarMenuPrincipal(telefono, empresa.nombre, nombre);
      return;
    }

    const citas = await Cita.find({ cliente: cliente._id, estado: { $nin: ['cancelada', 'realizada'] } })
      .sort({ fecha: 1 })
      .limit(3);

    if (citas.length === 0) {
      await WhatsAppService.enviarMensaje({
        telefono,
        mensaje: 'No tienes citas activas que se puedan cancelar en este momento.'
      });
      await enviarMenuPrincipal(telefono, empresa.nombre, nombre);
    } else {
      // Simplificar flujo de cancelación: dar instrucciones de soporte o link directo
      const linkMisCitas = 'https://stylemanager.co/mis-citas'; // Enlace dinámico
      await WhatsAppService.enviarMensaje({
        telefono,
        mensaje: `💈 Para cancelar una cita de forma segura, puedes hacerlo ingresando a tu panel de cliente en Style Manager o contactando a nuestro equipo de soporte directamente.\n\n🔗 *Gestionar Citas:* ${linkMisCitas}`
      });
      await enviarMenuPrincipal(telefono, empresa.nombre, nombre);
    }
  }
  // Fallback conversacional: CONSULTAR A GEMINI AI
  else {
    await procesarPreguntaAI(telefono, empresa, texto, nombre);
  }
}

// 2. SELECCIONAR SEDE
async function procesarSelectSede(session, empresa, texto, telefono) {
  const sedes = await Sede.find({ empresa: empresa._id, estado: true });
  const index = parseInt(texto) - 1;

  if (isNaN(index) || index < 0 || index >= sedes.length) {
    await WhatsAppService.enviarMensaje({
      telefono,
      mensaje: '⚠️ Por favor, responde únicamente con el número correspondiente a la sede que deseas.'
    });
    return;
  }

  session.datosCita = { ...session.datosCita, sedeId: sedes[index]._id.toString() };
  session.pasoActual = 'SELECT_SERVICIO';
  await session.save();

  await enviarListaServicios(telefono, empresa._id);
}

// 3. SELECCIONAR SERVICIO
async function procesarSelectServicio(session, empresa, texto, telefono) {
  const servicios = await Servicio.find({ empresa: empresa._id, estado: true });
  const index = parseInt(texto) - 1;

  if (isNaN(index) || index < 0 || index >= servicios.length) {
    await WhatsAppService.enviarMensaje({
      telefono,
      mensaje: '⚠️ Por favor, responde con el número del servicio que deseas reservar.'
    });
    return;
  }

  session.datosCita = { ...session.datosCita, servicioId: servicios[index]._id.toString() };
  session.pasoActual = 'SELECT_PELUQUERO';
  await session.save();

  // Buscar profesionales
  const peluqueros = await Usuario.find({ empresaId: empresa._id, estado: true })
    .populate('rol')
    .lean();

  const filtrados = peluqueros.filter(p => {
    const rolName = p.rol?.nombre?.toLowerCase() || '';
    return rolName === 'barbero' || rolName === 'peluquero' || rolName === 'manicurista';
  });

  let msg = `💈 *Paso 3/5: Selecciona tu barbero/profesional*\n\nResponde con el número de tu preferencia:\n\n`;
  filtrados.forEach((p, idx) => {
    msg += `${idx + 1}️⃣ *${p.nombre}*\n`;
  });
  msg += `${filtrados.length + 1}️⃣ *Cualquiera disponible*\n\n`;
  msg += `✍️ Escribe *cancelar* para salir.`;

  // Guardamos peluqueros en sesión para el mapeo del índice
  session.datosCita.peluquerosTmp = filtrados.map(p => p._id.toString());
  session.markModified('datosCita');
  await session.save();

  await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
}

// 4. SELECCIONAR PELUQUERO
async function procesarSelectPeluquero(session, empresa, texto, telefono) {
  const pIds = session.datosCita.peluquerosTmp || [];
  const index = parseInt(texto) - 1;

  let peluqueroId = null;

  if (index === pIds.length) {
    // Opción "Cualquiera disponible"
    peluqueroId = 'ANY';
  } else if (isNaN(index) || index < 0 || index > pIds.length) {
    await WhatsAppService.enviarMensaje({
      telefono,
      mensaje: '⚠️ Por favor, responde con el número del profesional seleccionado.'
    });
    return;
  } else {
    peluqueroId = pIds[index];
  }

  session.datosCita = { ...session.datosCita, peluqueroId };
  session.pasoActual = 'SELECT_FECHA';
  await session.save();

  // Enviar opciones de fecha
  const hoy = new Date();
  const manana = new Date();
  manana.setDate(hoy.getDate() + 1);

  const hoyStr = hoy.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });
  const mananaStr = manana.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' });

  const msg = `📅 *Paso 4/5: Selecciona la Fecha de tu Cita*\n\nElige el día respondiendo con el número:\n\n1️⃣ *Hoy* (${hoyStr})\n2️⃣ *Mañana* (${mananaStr})\n3️⃣ *Escribir otra fecha* (Formato DD/MM, ej: 29/05)\n\n✍️ Escribe *cancelar* para salir.`;
  await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
}

// 5. SELECCIONAR FECHA
async function procesarSelectFecha(session, empresa, texto, telefono) {
  let fechaElegida = new Date();

  if (texto === '1') {
    // Hoy
    fechaElegida = new Date();
  } else if (texto === '2') {
    // Mañana
    fechaElegida = new Date();
    fechaElegida.setDate(fechaElegida.getDate() + 1);
  } else {
    // Parsear fecha DD/MM
    const match = texto.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!match) {
      await WhatsAppService.enviarMensaje({
        telefono,
        mensaje: '⚠️ Formato de fecha inválido. Escribe la fecha en formato DD/MM (ej: 28/05) o responde 1 o 2.'
      });
      return;
    }

    const dia = parseInt(match[1]);
    const mes = parseInt(match[2]) - 1;
    const hoy = new Date();
    
    fechaElegida = new Date(hoy.getFullYear(), mes, dia);
    if (fechaElegida < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
      // Si la fecha ya pasó este año, asumir año siguiente
      fechaElegida.setFullYear(hoy.getFullYear() + 1);
    }
  }

  session.datosCita = { ...session.datosCita, fecha: fechaElegida.toISOString() };
  session.pasoActual = 'SELECT_HORA';
  await session.save();

  // Generar horarios de prueba estáticos simplificados
  const horas = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
  
  session.datosCita.horasTmp = horas;
  session.markModified('datosCita');
  await session.save();

  let msg = `⏰ *Paso 5/5: Elige la Hora*\n\nResponde únicamente con el número de horario:\n\n`;
  horas.forEach((h, idx) => {
    msg += `${idx + 1}️⃣ *${h}*\n`;
  });
  msg += `\n✍️ Escribe *cancelar* para reiniciar.`;

  await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
}

// 6. SELECCIONAR HORA
async function procesarSelectHora(session, empresa, texto, telefono) {
  const horas = session.datosCita.horasTmp || [];
  const index = parseInt(texto) - 1;

  if (isNaN(index) || index < 0 || index >= horas.length) {
    await WhatsAppService.enviarMensaje({
      telefono,
      mensaje: '⚠️ Por favor, responde con el número del horario seleccionado.'
    });
    return;
  }

  const horaElegida = horas[index];
  session.datosCita = { ...session.datosCita, hora: horaElegida };
  session.pasoActual = 'CONFIRMACION';
  await session.save();

  // Recuperar nombres para el resumen
  const sede = await Sede.findById(session.datosCita.sedeId);
  const servicio = await Servicio.findById(session.datosCita.servicioId);
  
  let barberoNombre = 'Cualquiera disponible';
  if (session.datosCita.peluqueroId !== 'ANY') {
    const barbero = await Usuario.findById(session.datosCita.peluqueroId);
    barberoNombre = barbero ? barbero.nombre : 'Barbero';
  }

  const fechaFormateada = new Date(session.datosCita.fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

  const msg = `📋 *Resumen de tu Reserva* 💈\n\n📍 *Sucursal:* ${sede?.nombre || 'Sede Principal'}\n✂ *Servicio:* ${servicio?.nombre || 'Servicio'} ($${servicio?.precio || '0'})\n💈 *Profesional:* ${barberoNombre}\n📅 *Fecha:* ${fechaFormateada}\n⏰ *Hora:* ${horaElegida}\n\n¿Confirmamos tu cita?\n\n1️⃣ *Sí, confirmar cita*\n2️⃣ *No, cancelar y volver al inicio*`;
  await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
}

// 7. CONFIRMACION FINAL
async function procesarConfirmacion(session, empresa, texto, telefono, nombre) {
  if (texto === '1') {
    try {
      // 1. Verificar o crear cliente en BD
      const celularSimple = telefono.slice(-10); // Últimos 10 dígitos para evitar líos de prefijo
      let cliente = await Cliente.findOne({ telefono: { $regex: new RegExp(celularSimple, 'i') } });

      if (!cliente) {
        cliente = new Cliente({
          nombre: nombre || 'Cliente WhatsApp',
          telefono: telefono,
          genero: 'Otro'
        });
        await cliente.save();
      }

      // 2. Si el peluquero es 'ANY', buscar el primer profesional calificado
      let peluqueroId = session.datosCita.peluqueroId;
      if (peluqueroId === 'ANY') {
        const peluqueros = await Usuario.find({ empresaId: empresa._id, estado: true }).populate('rol').lean();
        const filtrado = peluqueros.find(p => ['barbero', 'peluquero', 'manicurista'].includes(p.rol?.nombre?.toLowerCase()));
        peluqueroId = filtrado ? filtrado._id : null;
      }

      if (!peluqueroId) {
        await WhatsAppService.enviarMensaje({
          telefono,
          mensaje: '❌ Ocurrió un inconveniente al asignar un barbero. Por favor, intenta de nuevo.'
        });
        session.pasoActual = 'INICIO';
        session.datosCita = {};
        await session.save();
        return;
      }

      // 3. Crear la Cita
      const fechaBase = new Date(session.datosCita.fecha);
      const [h, m] = session.datosCita.hora.split(':').map(Number);
      const fechaFinal = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate(), h, m, 0);

      const nuevaCita = new Cita({
        cliente: cliente._id,
        sede: session.datosCita.sedeId,
        peluquero: peluqueroId,
        servicios: [session.datosCita.servicioId],
        fecha: fechaFinal,
        hora: session.datosCita.hora,
        estado: 'pendiente',
        observacion: 'Agendado mediante Bot de WhatsApp'
      });

      await nuevaCita.save();

      // 4. Confirmar ticket de éxito
      const ticket = `✅ *¡Cita Confirmada con Éxito!* 🎉\n\n🆔 *Código Cita:* ${nuevaCita._id.toString().slice(-6).toUpperCase()}\n📅 *Fecha:* ${fechaFinal.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}\n⏰ *Hora:* ${session.datosCita.hora}\n📍 *Lugar:* ${sede?.nombre || 'Style Manager'}\n\n¡Te esperamos! Recuerda llegar 5 minutos antes de tu cita. 💈`;
      
      await WhatsAppService.enviarMensaje({ telefono, mensaje: ticket });
      
      // Limpiar sesión
      session.pasoActual = 'INICIO';
      session.datosCita = {};
      await session.save();

    } catch (err) {
      console.error('Error al guardar cita de WhatsApp:', err);
      await WhatsAppService.enviarMensaje({
        telefono,
        mensaje: '❌ Ocurrió un error inesperado al procesar tu reserva. Inténtalo de nuevo escribiendo *Agendar*.'
      });
      session.pasoActual = 'INICIO';
      session.datosCita = {};
      await session.save();
    }
  } else {
    // Cancelar y limpiar
    session.pasoActual = 'INICIO';
    session.datosCita = {};
    await session.save();
    await WhatsAppService.enviarMensaje({
      telefono,
      mensaje: '❌ Cita cancelada correctamente.'
    });
    await enviarMenuPrincipal(telefono, empresa.nombre, nombre);
  }
}

/**
 * =========================================================================
 * 💬 SYSTEM HELPERS & AI FALLBACK
 * =========================================================================
 */

async function enviarMenuPrincipal(telefono, empresaNombre, clienteNombre) {
  const msg = `👋 ¡Hola *${clienteNombre}*! Bienvenido al Asistente Virtual Inteligente de *${empresaNombre}* 💈.\n\nEscribe el número de la opción que deseas realizar:\n\n1️⃣ *Agendar una nueva cita*\n2️⃣ *Ver mis próximas citas*\n3️⃣ *Cancelar una cita*\n4️⃣ *Soporte o información general*\n\n✍️ O realiza cualquier pregunta que tengas (ej: *¿Dónde quedan?*, *¿Cuáles son los precios?*) y nuestra Inteligencia Artificial te asistirá al instante.`;
  await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
}

async function enviarListaServicios(telefono, empresaId) {
  const servicios = await Servicio.find({ empresa: empresaId, estado: true });
  let msg = `✂ *Paso 2/5: Selecciona el Servicio*\n\nResponde únicamente con el número de la opción:\n\n`;
  servicios.forEach((s, idx) => {
    msg += `${idx + 1}️⃣ *${s.nombre}* — $${s.precio || '0'}\n⏱ Duración: ${s.duracion || 30} mins\n\n`;
  });
  msg += `✍️ Escribe *cancelar* para salir.`;
  await WhatsAppService.enviarMensaje({ telefono, mensaje: msg });
}

// 🧠 PROCESAMIENTO INTELIGENTE CON GOOGLE GEMINI 1.5 FLASH
async function procesarPreguntaAI(telefono, empresa, pregunta, clienteNombre) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      // Fallback si no está configurada la IA
      await enviarMenuPrincipal(telefono, empresa.nombre, clienteNombre);
      return;
    }

    // 1. Recopilar contexto real del negocio desde la DB para inyectar en el Prompt
    const sedes = await Sede.find({ empresa: empresa._id, estado: true });
    const servicios = await Servicio.find({ empresa: empresa._id, estado: true });

    const sedesContext = sedes.map(s => `- ${s.nombre}: ${s.direccion || 'Sin dirección'}`).join('\n');
    const serviciosContext = servicios.map(s => `- ${s.nombre}: $${s.precio || 0} (${s.duracion || 30} mins)`).join('\n');

    const prompt = `Eres el asistente virtual con Inteligencia Artificial de la barbería "${empresa.nombre}". Responde de forma amable, profesional y muy concisa (máximo 3 párrafos cortos) a la consulta del cliente basándote ÚNICAMENTE en la siguiente información de la empresa:

Nombre del negocio: ${empresa.nombre}
Contacto oficial: ${empresa.telefono || 'No disponible'}
Dirección de sucursales/sedes:\n${sedesContext || 'Sede principal en el centro'}
Servicios y Precios:\n${serviciosContext || 'Servicios generales de corte y barba'}

⚠️ REGLAS IMPORTANTES:
1. Responde de forma natural y cercana.
2. Si el cliente pide agendar una cita, explícale de forma amigable que debe escribir la palabra "Agendar" o responder con "1" para iniciar el proceso automatizado de reservas.
3. Si te preguntan algo que no está en este contexto oficial, responde con cordialidad que no dispones de esa información y sugiéreles contactar a soporte escribiendo al teléfono de la barbería.

Consulta del cliente: "${pregunta}"`;

    // 2. Realizar petición nativa a Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (answer) {
      await WhatsAppService.enviarMensaje({ telefono, mensaje: answer });
    } else {
      // Fallback
      await enviarMenuPrincipal(telefono, empresa.nombre, clienteNombre);
    }

  } catch (error) {
    console.error('❌ [WhatsApp AI Fallback Exception]', error);
    await enviarMenuPrincipal(telefono, empresa.nombre, clienteNombre);
  }
}

module.exports = {
  verificarWebhook,
  recibirMensaje
};
