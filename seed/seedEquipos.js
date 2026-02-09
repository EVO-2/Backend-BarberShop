require('dotenv').config();
const mongoose = require('mongoose');

const Equipo = require('../src/models/Equipo.model');
const EquipoMovimiento = require('../src/models/EquipoMovimiento.model');
const Sede = require('../src/models/Sede.model');
const PuestoTrabajo = require('../src/models/PuestoTrabajo.model');
const Usuario = require('../src/models/Usuario.model');

const seedEquipos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🟢 Conectado a MongoDB');

    // ---------------------------------------------------
    // 1. Verificar o crear datos requeridos
    // ---------------------------------------------------

    let admin = await Usuario.findOne();
    if (!admin) {
      admin = await Usuario.create({
        nombre: 'Admin Equipos',
        correo: 'admin.equipos@test.com',
        password: 'admin123',
        estado: true
      });
      console.log('⚠️ Admin creado porque no existía');
    }

    let sede = await Sede.findOne();
    if (!sede) {
      sede = await Sede.create({
        nombre: 'Sede Equipos',
        direccion: 'Calle Falsa 123',
        telefono: '3001234567'
      });
      console.log('⚠️ Sede creada porque no existía');
    }

    let puesto = await PuestoTrabajo.findOne();
    if (!puesto) {
      puesto = await PuestoTrabajo.create({
        nombre: 'Puesto Auto',
        sede: sede._id
      });
      console.log('⚠️ Puesto creado porque no existía');
    }

    // ---------------------------------------------------
    // 2. Limpiar datos anteriores
    // ---------------------------------------------------
    await Equipo.deleteMany({});
    await EquipoMovimiento.deleteMany({});
    console.log('🧹 Equipos y movimientos limpiados');

    // ---------------------------------------------------
    // 3. Crear 10 equipos de prueba
    // ---------------------------------------------------

    const tipos = ['secador', 'tijeras', 'silla', 'máquina', 'navaja'];
    const estados = ['activo', 'en_mantenimiento', 'dañado'];

    const equiposCreados = [];

    for (let i = 1; i <= 10; i++) {
      const equipo = await Equipo.create({
        nombre: `Equipo ${i}`,
        tipo: tipos[i % tipos.length],
        descripcion: `Descripción del equipo ${i}`,
        serial: `SER-${1000 + i}`,
        codigoInventario: `INV-${1000 + i}`,
        imagenes: [],
        sede: sede._id,
        puesto: puesto._id,
        asignadoA: null,
        estado: estados[i % estados.length],
        fechaCompra: new Date(2024, 0, i),
        proveedor: null,
        costo: 50000 + i * 1000,
        vidaUtilMeses: 12,
        ultimaRevision: new Date(),
        proximoMantenimiento: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        activo: true,
        creadoPor: admin._id,
        actualizadoPor: admin._id
      });

      equiposCreados.push(equipo);

      // Crear movimiento inicial tipo "alta"
      await EquipoMovimiento.create({
        equipo: equipo._id,
        tipo: 'alta',
        fromSede: null,
        toSede: sede._id,
        fromPuesto: null,
        toPuesto: puesto._id,
        responsable: admin._id,
        descripcion: 'Ingreso inicial por seed',
        fechaInicio: new Date(),
        costo: 0,
        creadoPor: admin._id
      });
    }

    console.log(`✅ ${equiposCreados.length} Equipos creados`);
    console.log(`📦 Movimientos de alta generados`);

    console.log('🎉 Seed de Equipos completado');
  } catch (err) {
    console.error('❌ Error en seedEquipos:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
};

seedEquipos();
