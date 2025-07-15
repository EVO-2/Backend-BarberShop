// seed/seedDatosIniciales.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Modelos
const Usuario       = require('../src/models/Usuario.model');
const Cliente       = require('../src/models/Cliente.model');
const Peluquero     = require('../src/models/Peluquero.model');
const Servicio      = require('../src/models/Servicio.model');
const Rol           = require('../src/models/Rol.model');
const Sede          = require('../src/models/Sede.model');
const PuestoTrabajo = require('../src/models/PuestoTrabajo.model');
const Cita          = require('../src/models/Cita.model');
const Pago          = require('../src/models/Pago.model');

const seedDatos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🟢 Conectado a MongoDB');

    /* 1. Roles */
    const [rolAdmin, rolCliente, rolBarbero] = await Promise.all([
      Rol.findOneAndUpdate({ nombre: 'admin'   }, { $setOnInsert: { descripcion: 'Administrador',              estado: true } }, { upsert: true, new: true }),
      Rol.findOneAndUpdate({ nombre: 'cliente' }, { $setOnInsert: { descripcion: 'Cliente que agenda citas',   estado: true } }, { upsert: true, new: true }),
      Rol.findOneAndUpdate({ nombre: 'barbero' }, { $setOnInsert: { descripcion: 'Empleado que atiende citas', estado: true } }, { upsert: true, new: true })
    ]);

    /* 2. Limpieza */
    await Promise.all([
      Usuario.deleteMany({}),
      Cliente.deleteMany({}),
      Peluquero.deleteMany({}),
      Servicio.deleteMany({}),
      Sede.deleteMany({}),
      PuestoTrabajo.deleteMany({}),
      Cita.deleteMany({}),
      Pago.deleteMany({})
    ]);
    console.log('🧹 Colecciones limpiadas');

    /* 3. Admin */
    await Usuario.create({
      nombre: 'Edward Admin',
      correo: 'admin@barberia.com',
      password:'admin123',
      rol: rolAdmin._id,
      estado: true
    });
    console.log('✅ Admin creado');

    /* 4. Clientes */
    const clientes = [];
    for (let i = 1; i <= 3; i++) {
      const usuario = await Usuario.create({
        nombre: `Cliente${i}`,
        correo: `cliente${i}@correo.com`,
        password: 'cliente123',
        rol: rolCliente._id,
        estado: true
      });
      clientes.push(await Cliente.create({ usuario: usuario._id }));
    }
    console.log('✅ 3 Clientes creados');

    /* 5. Peluqueros */
    const peluqueros = [];
    for (let i = 1; i <= 3; i++) {
      const usuario = await Usuario.create({
        nombre: `Peluquero${i}`,
        correo: `peluquero${i}@correo.com`,
        password: 'peluquero123',
        rol: rolBarbero._id,
        estado: true
      });
      peluqueros.push(await Peluquero.create({ usuario: usuario._id }));
    }
    console.log('✅ 3 Peluqueros creados');

    /* 6. Sede */
    const sede = await Sede.create({
      nombre: 'Sede Principal',
      direccion: 'Cra 123 #45‑67',
      telefono: '3001234567'
    });
    console.log('✅ Sede creada');

    /* 7. Puestos */
    const puestos = await PuestoTrabajo.insertMany([
      { nombre: 'Puesto 1', sede: sede._id, peluquero: peluqueros[0]._id },
      { nombre: 'Puesto 2', sede: sede._id, peluquero: peluqueros[1]._id },
      { nombre: 'Puesto 3', sede: sede._id, peluquero: peluqueros[2]._id }
    ]);
    console.log('✅ Puestos de trabajo creados');

    /* 8. Servicios */
    const servicios = await Servicio.insertMany([
      { nombre: 'Corte de cabello', precio: 15000, duracion: 30 },
      { nombre: 'Barba',            precio:  8000, duracion: 15 },
      { nombre: 'Corte + Barba',    precio: 20000, duracion: 45 }
    ]);
    console.log('✅ Servicios creados');

    /* 9. Citas + pagos */
    const estadosCita   = ['pendiente', 'confirmada', 'completada', 'cancelada'];
    const metodosPago   = ['efectivo', 'tarjeta', 'transferencia'];
    const observaciones = [
      'Cliente puntual',
      'Solicitó atención rápida',
      'Cita reprogramada previamente',
      'Primera vez del cliente',
      'Cliente frecuente',
      'Se aplicó descuento'
    ];

    for (let i = 0; i < 6; i++) {
      const cliente    = clientes[i % clientes.length];
      const peluquero  = peluqueros[i % peluqueros.length];
      const puesto     = puestos[i % puestos.length];
      const servicio   = servicios[i % servicios.length];

      const fechaCita = new Date();
      fechaCita.setDate(fechaCita.getDate() - i); // día actual - i

      const cita = await Cita.create({
        cliente: cliente._id,
        peluquero: peluquero._id,
        servicios: [servicio._id],
        sede: sede._id,
        puestoTrabajo: puesto._id,
        fecha: fechaCita,
        turno: i + 1,
        observaciones: observaciones[i],
        estado: estadosCita[i % estadosCita.length]
      });

      if (['confirmada', 'completada'].includes(cita.estado)) {
        await Pago.create({
          cita: cita._id,
          monto: servicio.precio,
          metodo: metodosPago[i % metodosPago.length],
          estado: 'pagado',
          observaciones: `Pago por ${servicio.nombre}`
        });
      }
    }
    console.log('✅ 6 Citas y pagos creados');

    console.log('🎉 Seed completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
};

seedDatos();
