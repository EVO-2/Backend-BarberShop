const Permiso = require('../models/Permiso.model');

// =============================
// GET
// =============================
const getPermisos = async (req, res) => {
    try {
        const permisos = await Permiso.find().sort({ modulo: 1, tipo: 1 });

        res.json({
            ok: true,
            permisos
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error al obtener permisos'
        });
    }
};

// =============================
// POST
// =============================
const crearPermiso = async (req, res) => {
    try {
        const { nombre, modulo, tipo, descripcion } = req.body;

        if (!nombre || !modulo || !tipo) {
            return res.status(400).json({
                ok: false,
                msg: 'nombre, modulo y tipo son obligatorios'
            });
        }

        // 🔥 Generar clave automáticamente
        const clave = `${tipo}_${modulo}`.toLowerCase();

        // Validar duplicado por clave
        const existe = await Permiso.findOne({ clave });

        if (existe) {
            return res.status(400).json({
                ok: false,
                msg: `El permiso ya existe: ${clave}`
            });
        }

        const permiso = new Permiso({
            nombre,
            modulo,
            tipo,
            clave,
            descripcion
        });

        await permiso.save();

        res.status(201).json({
            ok: true,
            permiso
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error al crear permiso'
        });
    }
};

// =============================
// PUT
// =============================
const actualizarPermiso = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, modulo, tipo, descripcion } = req.body;

        // 🔥 recalcular clave si cambian datos
        const clave = `${tipo}_${modulo}`.toLowerCase();

        const permiso = await Permiso.findByIdAndUpdate(
            id,
            { nombre, modulo, tipo, descripcion, clave },
            { new: true }
        );

        if (!permiso) {
            return res.status(404).json({
                ok: false,
                msg: 'Permiso no encontrado'
            });
        }

        res.json({
            ok: true,
            permiso
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error al actualizar permiso'
        });
    }
};

// =============================
// DELETE
// =============================
const eliminarPermiso = async (req, res) => {
    try {
        const { id } = req.params;

        const permiso = await Permiso.findByIdAndDelete(id);

        if (!permiso) {
            return res.status(404).json({
                ok: false,
                msg: 'Permiso no encontrado'
            });
        }

        res.json({
            ok: true,
            msg: 'Permiso eliminado'
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error al eliminar permiso'
        });
    }
};

module.exports = {
    getPermisos,
    crearPermiso,
    actualizarPermiso,
    eliminarPermiso
};