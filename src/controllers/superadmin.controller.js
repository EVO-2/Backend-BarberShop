const Empresa = require('../models/Empresa.model');
const Usuario = require('../models/Usuario.model');
const Cita = require('../models/Cita.model');
const Sede = require('../models/Sede.model');
const Rol = require('../models/Rol.model');
const HistorialAcceso = require('../models/HistorialAcceso.model');
const mongoose = require('mongoose');

// ==========================================
// 📊 Obtener Estadísticas Globales (SaaS)
// ==========================================
const obtenerEstadisticasGlobales = async (req, res) => {
    try {
        // 1. Conteo de empresas totales
        const totalEmpresas = await Empresa.countDocuments();

        // 2. Desglose de empresas por plan
        const planesBreakdown = await Empresa.aggregate([
            { $group: { _id: '$plan', cantidad: { $sum: 1 } } }
        ]);

        // 3. Desglose de empresas por estado de suscripción
        const estadosBreakdown = await Empresa.aggregate([
            { $group: { _id: '$suscripcionEstado', cantidad: { $sum: 1 } } }
        ]);

        // 4. Totales globales cruzando colecciones (con bypassTenant para Mongoose)
        const [totalUsuarios, totalCitas, totalSedes] = await Promise.all([
            Usuario.countDocuments().setOptions({ bypassTenant: true }),
            Cita.countDocuments().setOptions({ bypassTenant: true }),
            Sede.countDocuments().setOptions({ bypassTenant: true })
        ]);

        // 5. Últimos 20 eventos del historial de acceso global
        const historialReciente = await HistorialAcceso.find()
            .setOptions({ bypassTenant: true })
            .populate({
                path: 'usuario',
                select: 'nombre correo',
                options: { bypassTenant: true }
            })
            .populate({
                path: 'empresaId',
                select: 'nombre',
                options: { bypassTenant: true }
            })
            .sort({ fecha: -1 })
            .limit(20)
            .lean();

        res.json({
            ok: true,
            stats: {
                totalEmpresas,
                desglosePlanes: planesBreakdown,
                desgloseEstados: estadosBreakdown,
                totalUsuarios,
                totalCitas,
                totalSedes
            },
            historial: historialReciente
        });

    } catch (error) {
        console.error('❌ Error en obtenerEstadisticasGlobales:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener las estadísticas globales',
            error: error.message
        });
    }
};

// ==========================================
// 🏢 Listar Todas las Empresas
// ==========================================
const obtenerEmpresas = async (req, res) => {
    try {
        const empresas = await Empresa.find().sort({ createdAt: -1 }).lean();

        // Buscamos el rol de 'admin' para poder cruzar los dueños
        const rolAdmin = await Rol.findOne({ nombre: 'admin' });
        
        let admins = [];
        if (rolAdmin) {
            admins = await Usuario.find({ rol: rolAdmin._id })
                .setOptions({ bypassTenant: true })
                .select('nombre correo empresaId')
                .lean();
        }

        // Buscamos todas las sedes del sistema para contar cuántas tiene cada empresa
        const sedes = await Sede.find()
            .setOptions({ bypassTenant: true })
            .select('empresaId')
            .lean();

        // Mapear info consolidada
        const empresasConsolidadas = empresas.map(empresa => {
            const dueno = admins.find(adm => adm.empresaId?.toString() === empresa._id.toString());
            const sedesCount = sedes.filter(sd => sd.empresaId?.toString() === empresa._id.toString()).length;

            return {
                ...empresa,
                dueno: dueno ? {
                    nombre: dueno.nombre,
                    correo: dueno.correo
                } : null,
                sedesCount
            };
        });

        res.json({
            ok: true,
            total: empresasConsolidadas.length,
            empresas: empresasConsolidadas
        });

    } catch (error) {
        console.error('❌ Error en obtenerEmpresas:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener el listado de empresas',
            error: error.message
        });
    }
};

// ==========================================
// 🔑 Actualizar Suscripción Manualmente
// ==========================================
const actualizarSuscripcionEmpresa = async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, suscripcionEstado, fechaFinPrueba, fechaProximoCobro } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ ok: false, mensaje: 'ID de empresa no válido' });
        }

        const empresa = await Empresa.findById(id);
        if (!empresa) {
            return res.status(404).json({ ok: false, mensaje: 'Empresa no encontrada' });
        }

        // Actualizar campos si se proporcionan
        if (plan) empresa.plan = plan;
        if (suscripcionEstado) empresa.suscripcionEstado = suscripcionEstado;
        if (fechaFinPrueba !== undefined) empresa.fechaFinPrueba = fechaFinPrueba ? new Date(fechaFinPrueba) : null;
        if (fechaProximoCobro !== undefined) empresa.fechaProximoCobro = fechaProximoCobro ? new Date(fechaProximoCobro) : null;

        await empresa.save();

        res.json({
            ok: true,
            mensaje: 'Suscripción de la empresa actualizada con éxito',
            empresa
        });

    } catch (error) {
        console.error('❌ Error en actualizarSuscripcionEmpresa:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar la suscripción de la empresa',
            error: error.message
        });
    }
};

// ==========================================
// 🚫 Toggle Estado Activo/Inactivo de Empresa
// ==========================================
const toggleEmpresaEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ ok: false, mensaje: 'ID de empresa no válido' });
        }

        if (typeof estado !== 'boolean') {
            return res.status(400).json({ ok: false, mensaje: 'El campo estado debe ser de tipo boolean (true/false)' });
        }

        const empresa = await Empresa.findById(id);
        if (!empresa) {
            return res.status(404).json({ ok: false, mensaje: 'Empresa no encontrada' });
        }

        empresa.estado = estado;
        await empresa.save();

        res.json({
            ok: true,
            mensaje: `Empresa ${estado ? 'habilitada' : 'deshabilitada'} con éxito`,
            empresa
        });

    } catch (error) {
        console.error('❌ Error en toggleEmpresaEstado:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al cambiar el estado de la empresa',
            error: error.message
        });
    }
};

const listarSuperAdmins = async (req, res) => {
    try {
        const rolSuperAdmin = await Rol.findOne({ nombre: 'superadmin', empresaId: null });
        if (!rolSuperAdmin) {
            return res.status(404).json({ ok: false, mensaje: 'Rol superadmin no encontrado' });
        }
        const admins = await Usuario.find({ rol: rolSuperAdmin._id })
            .setOptions({ bypassTenant: true })
            .select('nombre correo createdAt estado')
            .lean();
        res.json({ ok: true, admins });
    } catch (error) {
        console.error('❌ Error en listarSuperAdmins:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al listar superadministradores', error: error.message });
    }
};

const obtenerSuperAdminPorId = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ ok: false, mensaje: 'ID de administrador no válido' });
        }
        const rolSuperAdmin = await Rol.findOne({ nombre: 'superadmin', empresaId: null });
        const admin = await Usuario.findOne({ _id: id, rol: rolSuperAdmin._id })
            .setOptions({ bypassTenant: true })
            .select('nombre correo createdAt estado')
            .lean();
        if (!admin) {
            return res.status(404).json({ ok: false, mensaje: 'Superadministrador no encontrado' });
        }
        res.json({ ok: true, admin });
    } catch (error) {
        console.error('❌ Error en obtenerSuperAdminPorId:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al obtener superadministrador', error: error.message });
    }
};

const crearSuperAdmin = async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;
        if (!nombre || !correo || !password) {
            return res.status(400).json({ ok: false, mensaje: 'Todos los campos (nombre, correo, contraseña) son obligatorios' });
        }
        
        const rolSuperAdmin = await Rol.findOne({ nombre: 'superadmin', empresaId: null });
        if (!rolSuperAdmin) {
            return res.status(404).json({ ok: false, mensaje: 'Rol superadmin no encontrado' });
        }
        
        const usuarioExistente = await Usuario.findOne({ correo: correo.toLowerCase().trim() })
            .setOptions({ bypassTenant: true });
        if (usuarioExistente) {
            return res.status(400).json({ ok: false, mensaje: 'El correo ya está registrado en la plataforma' });
        }
        
        const nuevoAdmin = new Usuario({
            nombre,
            correo: correo.toLowerCase().trim(),
            password,
            rol: rolSuperAdmin._id,
            empresaId: null,
            estado: true
        });
        
        await nuevoAdmin.save();
        res.status(201).json({
            ok: true,
            mensaje: 'Superadministrador creado con éxito',
            admin: {
                _id: nuevoAdmin._id,
                nombre: nuevoAdmin.nombre,
                correo: nuevoAdmin.correo,
                createdAt: nuevoAdmin.createdAt,
                estado: nuevoAdmin.estado
            }
        });
    } catch (error) {
        console.error('❌ Error en crearSuperAdmin:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al crear superadministrador', error: error.message });
    }
};

const actualizarSuperAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, password } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ ok: false, mensaje: 'ID de administrador no válido' });
        }
        
        const rolSuperAdmin = await Rol.findOne({ nombre: 'superadmin', empresaId: null });
        const admin = await Usuario.findOne({ _id: id, rol: rolSuperAdmin._id }).setOptions({ bypassTenant: true });
        if (!admin) {
            return res.status(404).json({ ok: false, mensaje: 'Superadministrador no encontrado' });
        }
        
        if (correo && correo.toLowerCase().trim() !== admin.correo) {
            const correoExistente = await Usuario.findOne({ correo: correo.toLowerCase().trim() })
                .setOptions({ bypassTenant: true });
            if (correoExistente) {
                return res.status(400).json({ ok: false, mensaje: 'El correo ya está en uso por otro usuario' });
            }
            admin.correo = correo.toLowerCase().trim();
        }
        
        if (nombre) admin.nombre = nombre;
        if (password) {
            admin.password = password;
        }
        
        await admin.save();
        res.json({
            ok: true,
            mensaje: 'Superadministrador actualizado con éxito',
            admin: {
                _id: admin._id,
                nombre: admin.nombre,
                correo: admin.correo,
                createdAt: admin.createdAt,
                estado: admin.estado
            }
        });
    } catch (error) {
        console.error('❌ Error en actualizarSuperAdmin:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al actualizar superadministrador', error: error.message });
    }
};

const toggleSuperAdminEstado = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ ok: false, mensaje: 'ID de administrador no válido' });
        }
        
        if (typeof estado !== 'boolean') {
            return res.status(400).json({ ok: false, mensaje: 'El campo estado es obligatorio y debe ser boolean' });
        }
        
        if (req.usuario._id.toString() === id) {
            return res.status(400).json({ ok: false, mensaje: 'No puedes cambiar el estado de tu propia cuenta de superadministrador' });
        }
        
        const rolSuperAdmin = await Rol.findOne({ nombre: 'superadmin', empresaId: null });
        
        if (estado === false) {
            const activosCount = await Usuario.countDocuments({ rol: rolSuperAdmin._id, estado: true })
                .setOptions({ bypassTenant: true });
            if (activosCount <= 1) {
                return res.status(400).json({ ok: false, mensaje: 'No se puede desactivar el último superadministrador activo de la plataforma' });
            }
        }
        
        const admin = await Usuario.findOne({ _id: id, rol: rolSuperAdmin._id }).setOptions({ bypassTenant: true });
        if (!admin) {
            return res.status(404).json({ ok: false, mensaje: 'Superadministrador no encontrado' });
        }
        
        admin.estado = estado;
        await admin.save();
        
        res.json({
            ok: true,
            mensaje: `Superadministrador ${estado ? 'activado' : 'desactivado'} con éxito`,
            admin: {
                _id: admin._id,
                nombre: admin.nombre,
                correo: admin.correo,
                estado: admin.estado
            }
        });
    } catch (error) {
        console.error('❌ Error en toggleSuperAdminEstado:', error);
        res.status(500).json({ ok: false, mensaje: 'Error al cambiar estado del superadministrador', error: error.message });
    }
};

module.exports = {
    obtenerEstadisticasGlobales,
    obtenerEmpresas,
    actualizarSuscripcionEmpresa,
    toggleEmpresaEstado,
    listarSuperAdmins,
    obtenerSuperAdminPorId,
    crearSuperAdmin,
    actualizarSuperAdmin,
    toggleSuperAdminEstado
};
