const Rol = require('../models/Rol.model');
const Permiso = require('../models/Permiso.model');

// ===============================
// 📌 CREAR ROL
// ===============================
exports.crearRol = async (req, res) => {
    try {
        const { nombre, descripcion, permisos, estado } = req.body;

        // 🔥 Validación clave
        if (!permisos || permisos.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Debe enviar al menos un permiso'
            });
        }

        const rol = new Rol({
            nombre,
            descripcion,
            permisos,
            estado: estado ?? true
        });

        await rol.save();

        res.json({
            ok: true,
            rol
        });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            ok: false,
            mensaje: 'Error creando rol',
            error
        });
    }
};

// ===============================
// 📌 LISTAR ROLES
// ===============================
exports.listarRoles = async (req, res) => {
    try {
        const roles = await Rol.find()
            .populate('permisos', 'nombre modulo');

        // 🔥 FORZAR estado booleano
        const rolesFormateados = roles.map(r => ({
            ...r._doc,
            estado: r.estado ?? true
        }));

        res.json({
            ok: true,
            roles: rolesFormateados
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            msg: 'Error al listar roles',
            error
        });
    }
};
// ===============================
// 📌 OBTENER ROL POR ID
// ===============================
exports.obtenerRol = async (req, res) => {
    try {
        const rol = await Rol.findById(req.params.id)
            .populate('permisos', 'nombre modulo');

        if (!rol) {
            return res.status(404).json({ msg: 'Rol no encontrado' });
        }

        res.json(rol);

    } catch (error) {
        res.status(500).json({ msg: 'Error al obtener rol', error });
    }
};

// ===============================
// 📌 ACTUALIZAR ROL
// ===============================
exports.actualizarRol = async (req, res) => {
    try {
        const updateData = {};

        if (req.body.nombre !== undefined) updateData.nombre = req.body.nombre;
        if (req.body.descripcion !== undefined) updateData.descripcion = req.body.descripcion;
        if (req.body.permisos !== undefined) updateData.permisos = req.body.permisos;
        if (req.body.estado !== undefined) updateData.estado = req.body.estado;

        const rol = await Rol.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json({ msg: 'Rol actualizado', rol });

    } catch (error) {
        res.status(500).json({ msg: 'Error al actualizar rol', error });
    }
};

// ===============================
// 📌 ELIMINAR (SOFT DELETE)
// ===============================
exports.eliminarRol = async (req, res) => {
    try {
        await Rol.findByIdAndUpdate(req.params.id, { estado: false });

        res.json({ msg: 'Rol desactivado correctamente' });

    } catch (error) {
        res.status(500).json({ msg: 'Error al eliminar rol', error });
    }
};