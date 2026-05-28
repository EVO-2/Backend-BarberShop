/**
 * 📱 Style Manager - Simulador Interactivo de Bot de WhatsApp
 * Este script permite probar el flujo completo del chatbot de reservas y la integración con Gemini 1.5 Flash
 * directamente desde la consola, emulando los eventos del Webhook oficial de Meta Cloud.
 */

require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const readline = require('readline');
const conectarDB = require('./src/config/db');

// Modelos para verificación y preparación de datos
const { tenantPlugin, tenantStorage } = require('./src/plugins/tenant');
const Empresa = require('./src/models/Empresa.model');
const Sede = require('./src/models/Sede.model');
const Servicio = require('./src/models/Servicio.model');
const Usuario = require('./src/models/Usuario.model');
const Rol = require('./src/models/Rol.model');
const WhatsAppSession = require('./src/models/WhatsAppSession.model');
const WhatsAppService = require('./src/services/whatsapp.service');
const whatsappController = require('./src/controllers/whatsapp.controller');

// Configuración de interfaz de entrada/salida
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const CLIENT_PHONE = '573001234567';
const CLIENT_NAME = 'Edwar Pruebas';

async function start() {
  console.clear();
  console.log('================================================================');
  console.log('       💈 STYLE MANAGER - SIMULADOR INTERACTIVO DE WHATSAPP 💈');
  console.log('================================================================');
  
  try {
    // 1. Conectar a Base de Datos
    await conectarDB();
    console.log('\n🟢 Conexión a base de datos establecida.');

    // 2. Garantizar/Preparar Datos Básicos de Prueba
    const empresa = await garantizarDatosPrueba();
    console.log(`🏢 Empresa Activa para Pruebas: "${empresa.nombre}" (ID: ${empresa._id})`);

    // 3. Mockear el envío saliente de WhatsApp
    WhatsAppService.enviarMensaje = async function({ telefono, mensaje }) {
      console.log('\n💬 [Bot de WhatsApp]:');
      console.log('----------------------------------------------------------------');
      console.log(mensaje);
      console.log('----------------------------------------------------------------\n');
      return { success: true, dummy: true };
    };

    // 4. Mostrar Menú de Opciones
    console.log('\n✨ Preparando el sandbox...');
    console.log('👉 Escribe "menu", "hola", "agendar" o "reiniciar" en cualquier momento.');
    console.log('👉 Escribe cualquier pregunta libre para probar Gemini 1.5 Flash.');
    console.log('👉 Escribe "salir" o "exit" para terminar la simulación.\n');

    // Limpiar sesión previa para empezar de cero
    await WhatsAppSession.deleteMany({ telefono: CLIENT_PHONE });
    console.log('🧹 Sesión de chat anterior limpiada. Empezando de cero.\n');

    // 5. Iniciar la interacción
    promptUser(empresa);

  } catch (error) {
    console.error('🔴 Error al iniciar el simulador:', error);
    process.exit(1);
  }
}

function promptUser(empresa) {
  rl.question('👤 Tú (Escribe un mensaje): ', async (input) => {
    const cleanInput = input.trim();

    if (cleanInput.toLowerCase() === 'salir' || cleanInput.toLowerCase() === 'exit') {
      console.log('\n👋 ¡Hasta luego! Cerrando conexión con MongoDB...');
      await mongoose.connection.close();
      process.exit(0);
    }

    if (!cleanInput) {
      promptUser(empresa);
      return;
    }

    try {
      // Simular la llegada del webhook de Meta
      // Usamos tenantStorage.run para evitar warnings de aislamiento de datos
      await tenantStorage.run(empresa._id.toString(), async () => {
        const req = {
          body: {
            entry: [{
              changes: [{
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: empresa.telefono || '1234567890'
                  },
                  contacts: [{
                    profile: {
                      name: CLIENT_NAME
                    },
                    wa_id: CLIENT_PHONE
                  }],
                  messages: [{
                    from: CLIENT_PHONE,
                    id: `wamid.Simulated_${Date.now()}`,
                    timestamp: Math.floor(Date.now() / 1000).toString(),
                    text: {
                      body: cleanInput
                    },
                    type: 'text'
                  }]
                }
              }]
            }]
          }
        };

        const res = {
          status: function(code) {
            return {
              send: function(data) {
                // Callback recibido por el controlador
              },
              json: function(data) {
                // Callback recibido por el controlador
              }
            };
          }
        };

        await whatsappController.recibirMensaje(req, res);
      });

      // Breve retardo para ordenar la visualización de consola antes de pedir la siguiente entrada
      setTimeout(() => {
        promptUser(empresa);
      }, 500);

    } catch (err) {
      console.error('❌ Error al procesar el mensaje:', err);
      promptUser(empresa);
    }
  });
}

/**
 * Garantiza que existan datos de prueba necesarios para el bot en la DB.
 * Si la DB está vacía o faltan elementos esenciales, los crea automáticamente.
 */
async function garantizarDatosPrueba() {
  // 1. Buscar o crear Empresa
  let empresa = await Empresa.findOne();
  if (!empresa) {
    console.log('🌱 Base de datos vacía. Creando Empresa de prueba...');
    empresa = new Empresa({
      nombre: 'Barbería El Elegante JEVO',
      telefono: '573009999999',
      correo: 'barberia_elegante@test.com',
      plan: 'premium',
      suscripcionEstado: 'trial',
      configuracion: { timezone: 'America/Bogota' }
    });
    await empresa.save();
  } else {
    // Forzar plan premium y estado trial para pasar validación de bot de WhatsApp
    empresa.plan = 'premium';
    empresa.suscripcionEstado = 'trial';
    await empresa.save();
  }

  // 2. Buscar o crear Sede
  let sede = await Sede.findOne({ empresaId: empresa._id });
  if (!sede) {
    console.log('🌱 Creando Sede de prueba...');
    sede = new Sede({
      nombre: 'Sede Central Chapinero',
      direccion: 'Calle 63 # 13-45, Bogotá',
      telefono: '3009999991',
      empresaId: empresa._id,
      estado: true
    });
    await sede.save();
  }

  // 3. Buscar o crear Servicios
  let servicios = await Servicio.find({ empresaId: empresa._id });
  if (servicios.length === 0) {
    console.log('🌱 Creando Servicios de prueba...');
    const corte = new Servicio({
      nombre: 'Corte de Cabello Clásico',
      descripcion: 'Corte con tijera o máquina a elección del cliente.',
      precio: 25000,
      duracion: 30,
      empresaId: empresa._id,
      estado: true
    });
    await corte.save();

    const barba = new Servicio({
      nombre: 'Perfilado de Barba Premium',
      descripcion: 'Cuidado completo de barba con toalla caliente.',
      precio: 18000,
      duracion: 25,
      empresaId: empresa._id,
      estado: true
    });
    await barba.save();
    
    servicios = [corte, barba];
  }

  // 4. Buscar o crear Profesional / Peluquero
  let barberoRol = await Rol.findOne({ nombre: { $regex: /barbero|peluquero/i } });
  if (!barberoRol) {
    barberoRol = await Rol.findOne({ nombre: 'PELUQUERO' }) || await Rol.findOne();
  }
  if (!barberoRol) {
    console.log('🌱 Creando Rol Peluquero...');
    barberoRol = new Rol({
      nombre: 'PELUQUERO',
      descripcion: 'Profesional de corte',
      permisos: []
    });
    await barberoRol.save();
  }

  let peluquero = await Usuario.findOne({ empresaId: empresa._id });
  if (!peluquero) {
    console.log('🌱 Creando Peluquero/Profesional de prueba...');
    peluquero = new Usuario({
      nombre: 'Carlos Mendoza',
      correo: 'carlos@elegante.com',
      contrasena: '$2a$10$UnXzTETdSwm9mC0RfZ7hNOCqgKzP0w27wLd0x.354eO4gL4G71zfa', // hashed password
      empresaId: empresa._id,
      rol: barberoRol._id,
      estado: true
    });
    await peluquero.save();
  }

  return empresa;
}

start();
