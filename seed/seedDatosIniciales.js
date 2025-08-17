// seed/seedDatosIniciales.js
require('dotenv').config();
const mongoose = require('mongoose');

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

    /* 🔥 Limpieza de índices viejos de PuestoTrabajo */
    await PuestoTrabajo.collection.dropIndexes().catch(err => {
      if (err.code === 26) {
        console.log('⚠️ No había índices previos en PuestoTrabajo');
      } else {
        throw err;
      }
    });
    await PuestoTrabajo.syncIndexes();
    console.log('✅ Índices de PuestoTrabajo regenerados');

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
    const admin = await Usuario.create({
      nombre: 'Edward Ortiz',
      correo: 'evo@gmail.com',
      password: 'admin123',
      rol: rolAdmin._id,
      estado: true
    });
    console.log('✅ Admin creado');

    /* 4. Clientes */
    const nombresClientes = ['Juan Perez', 'Maria Lopez', 'Carlos Diaz'];
    const clientes = [];

    for (let i = 0; i < nombresClientes.length; i++) {
      const usuarioCliente = await Usuario.create({
        nombre: nombresClientes[i],
        correo: `cliente${i + 1}@correo.com`,
        password: 'cliente123',
        rol: rolCliente._id,
        estado: true
      });

      const cliente = await Cliente.create({
        usuario: usuarioCliente._id,
        telefono: `300000000${i + 1}`,
        direccion: `Calle ${i + 1} #${i + 1}-00`,
        genero: i % 2 === 0 ? 'masculino' : 'femenino',
        fecha_nacimiento: new Date(1990 + i, i + 1, i + 1) 
      });

      usuarioCliente.cliente = cliente._id;
      await usuarioCliente.save();

      clientes.push(cliente);
    }
    console.log('✅ 3 Clientes creados');

    /* 5. Sedes */
    const sedePrincipal = await Sede.create({
      nombre: 'Sede Principal',
      direccion: 'Cra 123 #45-67',
      telefono: '3001234567'
    });

    const sedeNorte = await Sede.create({
      nombre: 'Sede Norte',
      direccion: 'Av 45 #10-20',
      telefono: '3019876543'
    });
    console.log('✅ 2 Sedes creadas');

    /* 6. Peluqueros */
    const nombresPeluquerosPrincipal = ['Andres Cortes', 'Lucia Gomez', 'Pedro Ramirez'];
    const nombresPeluquerosNorte     = ['Laura Torres', 'Miguel Alvarez', 'Sofia Herrera'];

    const peluqueros = [];
    for (let i = 0; i < nombresPeluquerosPrincipal.length; i++) {
      const usuarioPeluquero = await Usuario.create({
        nombre: nombresPeluquerosPrincipal[i],
        correo: `peluquero${i + 1}@correo.com`,
        password: 'peluquero123',
        rol: rolBarbero._id,
        estado: true
      });

      const peluquero = await Peluquero.create({
        usuario: usuarioPeluquero._id,
        especialidades: ['Corte clásico', 'Fade', 'Barba'].slice(0, i + 1),
        experiencia: i + 2,
        telefono_profesional: `310000000${i + 1}`,
        direccion_profesional: `Local ${i + 1} - ${sedePrincipal.nombre}`,
        genero: i % 2 === 0 ? 'masculino' : 'femenino',
        sede: sedePrincipal._id,
        fecha_nacimiento: new Date(1985 + i, i + 1, i + 1)
      });

      usuarioPeluquero.peluquero = peluquero._id;
      await usuarioPeluquero.save();

      peluqueros.push(peluquero);
    }

    const peluquerosNorte = [];
    for (let i = 0; i < nombresPeluquerosNorte.length; i++) {
      const usuarioPeluquero = await Usuario.create({
        nombre: nombresPeluquerosNorte[i],
        correo: `peluquero${i + 4}@correo.com`,
        password: 'peluquero123',
        rol: rolBarbero._id,
        estado: true
      });

      const peluquero = await Peluquero.create({
        usuario: usuarioPeluquero._id,
        especialidades: ['Corte clásico', 'Fade', 'Barba'].slice(0, (i % 3) + 1),
        experiencia: i + 4,
        telefono_profesional: `320000000${i + 4}`,
        direccion_profesional: `Local ${i + 4} - ${sedeNorte.nombre}`,
        genero: i % 2 === 0 ? 'masculino' : 'femenino',
        sede: sedeNorte._id,
        fecha_nacimiento: new Date(1980 + i, (i % 12), (i % 28) + 1)
      });

      usuarioPeluquero.peluquero = peluquero._id;
      await usuarioPeluquero.save();

      peluquerosNorte.push(peluquero);
    }
    console.log('✅ Peluqueros creados en ambas sedes');

    /* 7. Puestos */
    const puestosPrincipal = await PuestoTrabajo.insertMany([
      { nombre: 'Puesto 1', sede: sedePrincipal._id, peluquero: peluqueros[0]._id },
      { nombre: 'Puesto 2', sede: sedePrincipal._id, peluquero: peluqueros[1]._id },
      { nombre: 'Puesto 3', sede: sedePrincipal._id, peluquero: peluqueros[2]._id }
    ]);

    const puestosNorte = await PuestoTrabajo.insertMany([
      { nombre: 'Puesto 1', sede: sedeNorte._id, peluquero: peluquerosNorte[0]._id },
      { nombre: 'Puesto 2', sede: sedeNorte._id, peluquero: peluquerosNorte[1]._id },
      { nombre: 'Puesto 3', sede: sedeNorte._id, peluquero: peluquerosNorte[2]._id }
    ]);

    [...peluqueros, ...peluquerosNorte].forEach(async (peluquero, i) => {
      peluquero.puestoTrabajo = (i < 3 ? puestosPrincipal[i] : puestosNorte[i - 3])._id;
      await peluquero.save();
    });

    console.log('✅ Puestos de trabajo creados en ambas sedes');

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

    const todosPeluqueros = [...peluqueros, ...peluquerosNorte];
    const todosPuestos    = [...puestosPrincipal, ...puestosNorte];

    for (let i = 0; i < 8; i++) {
      const cliente    = clientes[i % clientes.length];
      const peluquero  = todosPeluqueros[i % todosPeluqueros.length];
      const puesto     = todosPuestos[i % todosPuestos.length];
      const servicio   = servicios[i % servicios.length];

      const fechaCita = new Date();
      fechaCita.setDate(fechaCita.getDate() + (i + 1));

      const cita = await Cita.create({
        cliente: cliente._id,
        peluquero: peluquero._id,
        servicios: [servicio._id],
        sede: peluquero.sede,
        puestoTrabajo: puesto._id,
        fecha: fechaCita,
        turno: i + 1,
        observaciones: observaciones[i % observaciones.length],
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
    console.log('✅ 8 Citas y pagos creados');

    console.log('🎉 Seed completado exitosamente');
  } catch (error) {
    console.error('❌ Error en el seed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
};

seedDatos();
