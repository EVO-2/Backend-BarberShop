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

module.exports = {
    obtenerEstadisticasGlobales,
    obtenerEmpresas,
    actualizarSuscripcionEmpresa,
    toggleEmpresaEstado
};
