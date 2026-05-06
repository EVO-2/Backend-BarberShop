const Empresa = require('../models/Empresa.model');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Permiso = require('../models/Permiso.model');
const PlanSuscripcion = require('../models/PlanSuscripcion.model');
const { tenantStorage } = require('../plugins/tenant');
const mongoose = require('mongoose');

const registrarEmpresa = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { empresa, usuario, planId } = req.body;

        // 1. Validar que la empresa no exista
        const empresaExistente = await Empresa.findOne({ nombre: empresa.nombre });
        if (empresaExistente) {
            return res.status(400).json({ msg: 'El nombre de la empresa ya está en uso' });
        }

        // 2. Validar que el correo del usuario no esté registrado globalmente
        const usuarioExistente = await Usuario.findOne({ correo: usuario.correo });
        if (usuarioExistente) {
            return res.status(400).json({ msg: 'El correo del usuario ya está registrado en el sistema' });
        }

        // 3. Crear la Empresa
        let planSeleccionado = await PlanSuscripcion.findById(planId);
        if (!planSeleccionado) {
            planSeleccionado = await PlanSuscripcion.findOne({ nombre: 'TRIAL' }) || await PlanSuscripcion.findOne();
        }

        const nuevaEmpresa = new Empresa({
            nombre: empresa.nombre,
            email: usuario.correo,
            telefono: empresa.telefono || '',
            direccion: empresa.direccion || '',
            plan: planSeleccionado ? planSeleccionado.nombre : 'trial',
            suscripcionEstado: 'trial'
        });

        await nuevaEmpresa.save({ session });

        // EJECUTAR EL RESTO DENTRO DEL CONTEXTO DEL TENANT (EMPRESA CREADA)
        await tenantStorage.run(nuevaEmpresa._id, async () => {
            
            // 4. Crear Rol de Administrador por defecto para esta empresa
            const rolAdmin = new Rol({
                nombre: 'administrador',
                descripcion: 'Administrador principal de la empresa (SaaS)',
                empresaId: nuevaEmpresa._id
            });
            await rolAdmin.save({ session });

            // 5. Crear el Usuario Dueño
            const nuevoUsuario = new Usuario({
                nombre: usuario.nombre,
                correo: usuario.correo,
                password: usuario.password,
                rol: rolAdmin._id,
                empresaId: nuevaEmpresa._id
            });
            
            await nuevoUsuario.save({ session });
        });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            msg: 'Empresa y usuario creados con éxito. Bienvenido al sistema.',
            empresa: nuevaEmpresa
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('[Onboarding Error]', error);
        res.status(500).json({ msg: 'Error al registrar la empresa', error: error.message });
    }
};

module.exports = {
    registrarEmpresa
};
