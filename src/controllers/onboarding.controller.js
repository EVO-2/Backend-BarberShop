const Empresa = require('../models/Empresa.model');
const Usuario = require('../models/Usuario.model');
const Rol = require('../models/Rol.model');
const Permiso = require('../models/Permiso.model');
const PlanSuscripcion = require('../models/PlanSuscripcion.model');

const { tenantStorage } = require('../plugins/tenant');

const mongoose = require('mongoose');

const registrarEmpresa = async (req, res) => {
    const session = await mongoose.startSession();

    try {
        await session.startTransaction();

        const {
            empresa,
            usuario,
            planId
        } = req.body;

        /* =====================================================
           VALIDAR EMPRESA
        ===================================================== */
        const empresaExistente = await Empresa.findOne({
            nombre: {
                $regex: new RegExp(`^${empresa.nombre}$`, 'i')
            }
        })
            .setOptions({ bypassTenant: true })
            .session(session);

        if (empresaExistente) {
            await session.abortTransaction();

            return res.status(400).json({
                msg: 'El nombre de la empresa ya está en uso'
            });
        }

        /* =====================================================
           VALIDAR USUARIO
        ===================================================== */
        const usuarioExistente = await Usuario.findOne({
            correo: {
                $regex: new RegExp(`^${usuario.correo}$`, 'i')
            }
        })
            .setOptions({ bypassTenant: true })
            .session(session);

        if (usuarioExistente) {
            await session.abortTransaction();

            return res.status(400).json({
                msg: 'El correo del usuario ya está registrado en el sistema'
            });
        }

        /* =====================================================
           OBTENER PLAN
        ===================================================== */
        let planSeleccionado = null;

        if (planId) {
            planSeleccionado = await PlanSuscripcion.findById(planId)
                .setOptions({ bypassTenant: true })
                .session(session);
        }

        if (!planSeleccionado) {
            planSeleccionado = await PlanSuscripcion.findOne({
                nombre: {
                    $regex: /^trial$/i
                }
            })
                .setOptions({ bypassTenant: true })
                .session(session);

            if (!planSeleccionado) {
                planSeleccionado = await PlanSuscripcion.findOne()
                    .setOptions({ bypassTenant: true })
                    .session(session);
            }
        }

        const nombrePlan = planSeleccionado?.nombre
            ? String(planSeleccionado.nombre).toLowerCase()
            : 'trial';

        let logoUrl = 'assets/sede.png';

        if (req.file) {
            logoUrl = req.file.location;

            if (!logoUrl) {
                const { BUCKET_NAME } = require('../config/minio');

                const endpoint =
                    process.env.MINIO_ENDPOINT || 'localhost';

                const port =
                    process.env.MINIO_PORT &&
                        process.env.MINIO_PORT !== '443' &&
                        process.env.MINIO_PORT !== '80'
                        ? `:${process.env.MINIO_PORT}`
                        : '';

                const minioPublicUrl =
                    process.env.MINIO_PUBLIC_URL ||
                    `${process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http'}://${endpoint}${port}`;

                logoUrl =
                    `${minioPublicUrl}/${BUCKET_NAME}/${req.file.key}`;
            }
        }

        /* =====================================================
           CREAR EMPRESA
        ===================================================== */
        const nuevaEmpresa = new Empresa({
            nombre: empresa.nombre,
            email: usuario.correo,
            telefono: empresa.telefono || '',
            direccion: empresa.direccion || '',
            logo: logoUrl,

            plan: nombrePlan,

            suscripcionEstado: 'trial'
        });

        await nuevaEmpresa.save({ session });

        console.log('✅ Empresa creada:', nuevaEmpresa.nombre);

        /* =====================================================
           CONTEXTO TENANT
        ===================================================== */
        await tenantStorage.run(
            nuevaEmpresa._id,
            async () => {

                /* =============================================
                   BUSCAR ROL ADMIN
                ============================================= */
                let rolAdmin = await Rol.findOne({
                    nombre: 'admin'
                })
                    .setOptions({ bypassTenant: true })
                    .session(session);

                /* =============================================
                   CREAR ROL SI NO EXISTE
                ============================================= */
                if (!rolAdmin) {
                    rolAdmin = new Rol({
                        nombre: 'admin',
                        descripcion:
                            'Administrador principal de la empresa (SaaS)',
                        empresaId: nuevaEmpresa._id
                    });

                    await rolAdmin.save({ session });

                    console.log('✅ Rol admin creado');
                } else {
                    console.log('ℹ️ Rol admin reutilizado');
                }

                /* =============================================
                   CREAR USUARIO DUEÑO
                ============================================= */
                const nuevoUsuario = new Usuario({
                    nombre: usuario.nombre,
                    correo: usuario.correo,
                    password: usuario.password,
                    rol: rolAdmin._id,
                    empresaId: nuevaEmpresa._id
                });

                await nuevoUsuario.save({ session });

                console.log('✅ Usuario admin creado');
            }
        );

        /* =====================================================
           COMMIT
        ===================================================== */
        await session.commitTransaction();

        return res.status(201).json({
            msg: 'Empresa y usuario creados con éxito. Bienvenido al sistema.',
            empresa: nuevaEmpresa
        });

    } catch (error) {

        await session.abortTransaction();

        console.error('[Onboarding Error]', error);

        return res.status(500).json({
            msg: 'Error al registrar la empresa',
            error: error.message
        });

    } finally {

        await session.endSession();

    }
};

const verificarEmpresa = async (req, res) => {
    try {
        const { nombre } = req.query;

        if (!nombre) {
            return res.json({
                disponible: true
            });
        }

        const empresa = await Empresa.findOne({
            nombre: {
                $regex: new RegExp(`^${nombre}$`, 'i')
            }
        }).setOptions({
            bypassTenant: true
        });

        return res.json({
            disponible: !empresa
        });

    } catch (error) {

        return res.status(500).json({
            error: error.message
        });

    }
};

const verificarCorreo = async (req, res) => {
    try {
        const { correo } = req.query;

        if (!correo) {
            return res.json({
                disponible: true
            });
        }

        const usuario = await Usuario.findOne({
            correo: {
                $regex: new RegExp(`^${correo}$`, 'i')
            }
        }).setOptions({
            bypassTenant: true
        });

        return res.json({
            disponible: !usuario
        });

    } catch (error) {

        return res.status(500).json({
            error: error.message
        });

    }
};

module.exports = {
    registrarEmpresa,
    verificarEmpresa,
    verificarCorreo
};