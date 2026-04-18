require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Rol = require('../src/models/Rol.model');
const Permiso = require('../src/models/Permiso.model');
const Usuario = require('../src/models/Usuario.model');
const Peluquero = require('../src/models/Peluquero.model');
const Sede = require('../src/models/Sede.model');

// 🔥 NUEVOS MODELOS
const Producto = require('../src/models/Producto.model');
const Categoria = require('../src/models/Categoria.model');
const Proveedor = require('../src/models/Proveedor.model');

const seedSistemaPro = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🟢 Conectado a MongoDB');

        // =============================
        // 1. PERMISOS COMPLETOS
        // =============================
        const permisosBase = [

            { nombre: 'ver_productos', modulo: 'productos' },
            { nombre: 'crear_producto', modulo: 'productos' },
            { nombre: 'editar_producto', modulo: 'productos' },
            { nombre: 'eliminar_producto', modulo: 'productos' },

            { nombre: 'ver_movimientos', modulo: 'equipomovimientos' },
            { nombre: 'registrar_movimiento', modulo: 'equipomovimientos' },

            { nombre: 'ver_equipos', modulo: 'equipos' },
            { nombre: 'crear_equipo', modulo: 'equipos' },
            { nombre: 'editar_equipo', modulo: 'equipos' },

            { nombre: 'ver_citas', modulo: 'citas' },
            { nombre: 'crear_cita', modulo: 'citas' },
            { nombre: 'editar_cita', modulo: 'citas' },
            { nombre: 'cancelar_cita', modulo: 'citas' },

            { nombre: 'ver_pagos', modulo: 'pagos' },
            { nombre: 'registrar_pago', modulo: 'pagos' },

            { nombre: 'ver_clientes', modulo: 'clientes' },
            { nombre: 'crear_cliente', modulo: 'clientes' },
            { nombre: 'editar_cliente', modulo: 'clientes' },

            { nombre: 'ver_peluqueros', modulo: 'peluqueros' },
            { nombre: 'crear_peluquero', modulo: 'peluqueros' },
            { nombre: 'editar_peluquero', modulo: 'peluqueros' },

            { nombre: 'ver_puestos', modulo: 'puestotrabajos' },
            { nombre: 'asignar_puesto', modulo: 'puestotrabajos' },

            { nombre: 'ver_sedes', modulo: 'sedes' },
            { nombre: 'crear_sede', modulo: 'sedes' },
            { nombre: 'editar_sede', modulo: 'sedes' },

            { nombre: 'ver_servicios', modulo: 'servicios' },
            { nombre: 'crear_servicio', modulo: 'servicios' },
            { nombre: 'editar_servicio', modulo: 'servicios' },

            { nombre: 'ver_usuarios', modulo: 'usuarios' },
            { nombre: 'crear_usuario', modulo: 'usuarios' },
            { nombre: 'editar_usuario', modulo: 'usuarios' },

            { nombre: 'ver_roles', modulo: 'roles' },
            { nombre: 'asignar_roles', modulo: 'roles' },

            { nombre: 'ver_dashboard', modulo: 'dashboard' }
        ];

        const permisosCreados = [];

        for (const permiso of permisosBase) {
            const p = await Permiso.findOneAndUpdate(
                { nombre: permiso.nombre },
                { $setOnInsert: permiso },
                { new: true, upsert: true }
            );
            permisosCreados.push(p);
        }

        console.log('✅ Permisos creados/verificados');

        // =============================
        // 2. ROLES
        // =============================
        const todosPermisos = permisosCreados.map(p => p._id);

        await Rol.findOneAndUpdate(
            { nombre: 'admin' },
            { $set: { permisos: todosPermisos } },
            { new: true, upsert: true }
        );

        await Rol.findOneAndUpdate(
            { nombre: 'cliente' },
            {
                $set: {
                    permisos: permisosCreados
                        .filter(p => ['ver_citas', 'crear_cita'].includes(p.nombre))
                        .map(p => p._id)
                }
            },
            { new: true, upsert: true }
        );

        const permisosEmpleado = permisosCreados
            .filter(p =>
                ['ver_citas', 'editar_cita', 'ver_servicios']
                    .includes(p.nombre)
            )
            .map(p => p._id);

        await Rol.findOneAndUpdate(
            { nombre: 'barbero' },
            { $set: { permisos: permisosEmpleado } },
            { new: true, upsert: true }
        );

        const rolManicurista = await Rol.findOneAndUpdate(
            { nombre: 'manicurista' },
            {
                $set: { permisos: permisosEmpleado },
                $setOnInsert: {
                    descripcion: 'Especialista en uñas y estética',
                    estado: true
                }
            },
            { new: true, upsert: true }
        );

        console.log('✅ Roles actualizados');

        // =============================
        // 3. SEDE BASE
        // =============================
        const sede = await Sede.findOne();

        if (!sede) {
            console.log('❌ No hay sedes registradas');
            return;
        }

        // =============================
        // 4. PROVEEDORES
        // =============================
        const proveedoresData = [
            { nombre: 'L’Oréal Pro', empresa: 'L’Oréal' },
            { nombre: 'Babyliss Colombia', empresa: 'Babyliss' },
            { nombre: 'Wella Professionals', empresa: 'Wella' }
        ];

        const proveedores = [];

        for (const p of proveedoresData) {
            const proveedor = await Proveedor.findOneAndUpdate(
                { nombre: p.nombre },
                { $setOnInsert: { ...p, estado: true } },
                { new: true, upsert: true }
            );
            proveedores.push(proveedor);
        }

        console.log('✅ Proveedores creados/verificados');

        // =============================
        // 5. CATEGORIAS
        // =============================
        const categoriasData = [
            { nombre: 'Cuidado Capilar' },
            { nombre: 'Herramientas' },
            { nombre: 'Tintes' }
        ];

        const categorias = [];

        for (const c of categoriasData) {
            const categoria = await Categoria.findOneAndUpdate(
                { nombre: c.nombre },
                { $setOnInsert: { ...c, estado: true } },
                { new: true, upsert: true }
            );
            categorias.push(categoria);
        }

        console.log('✅ Categorías creadas/verificadas');

        // =============================
        // 6. PRODUCTOS
        // =============================
        const productosData = [
            {
                nombre: 'Gel fijador profesional',
                precio: 15000,
                cantidad: 20,
                categoria: categorias[0]._id,
                proveedor: proveedores[0]._id,
                sede: sede._id,
                imagen: 'https://res.cloudinary.com/demo/image/upload/v1/gel.jpg'
            },
            {
                nombre: 'Secador Babyliss 3000',
                precio: 180000,
                cantidad: 5,
                categoria: categorias[1]._id,
                proveedor: proveedores[1]._id,
                sede: sede._id,
                tipo: 'uso_interno',
                imagen: 'https://res.cloudinary.com/demo/image/upload/v1/secador.jpg'
            },
            {
                nombre: 'Tinte Wella Color',
                precio: 25000,
                cantidad: 30,
                categoria: categorias[2]._id,
                proveedor: proveedores[2]._id,
                sede: sede._id,
                imagen: 'https://res.cloudinary.com/demo/image/upload/v1/tinte.jpg'
            }
        ];

        for (const prod of productosData) {
            await Producto.findOneAndUpdate(
                { nombre: prod.nombre },
                { $setOnInsert: { ...prod, estado: true } },
                { upsert: true }
            );
        }

        console.log('✅ Productos creados/verificados');

        // =============================
        // 7. MANICURISTAS (TU LÓGICA ORIGINAL)
        // =============================
        const nombres = [
            'Ana Gomez',
            'Laura Martinez',
            'Sofia Rodriguez'
        ];

        for (let i = 1; i <= 3; i++) {

            const correo = `manicurista${i}@correo.com`;

            let usuario = await Usuario.findOne({ correo });

            if (!usuario) {
                usuario = await Usuario.create({
                    nombre: nombres[i - 1],
                    correo,
                    password: bcrypt.hashSync('manicurista123', 10),
                    rol: rolManicurista._id,
                    estado: true
                });
            }

            let existe = await Peluquero.findOne({ usuario: usuario._id });

            if (!existe) {
                await Peluquero.create({
                    usuario: usuario._id,
                    especialidades: ['Uñas', 'Alisados', 'Keratina'],
                    experiencia: 2 + i,
                    telefono_profesional: `310000000${i}`,
                    direccion_profesional: `Area estetica ${i}`,
                    genero: 'femenino',
                    sede: sede._id
                });
            }
        }

        console.log('✅ Manicuristas creados/verificados');
        console.log('🎉 SEED COMPLETADO SIN AFECTAR DATOS');

    } catch (error) {
        console.error('❌ Error en seed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado');
    }
};

seedSistemaPro();