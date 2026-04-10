const Rol = require('../models/Rol.model');
const Permiso = require('../models/Permiso.model');

// ===============================
// 📌 CREAR ROL
// ===============================
exports.crearRol = async (req, res) => {
    try {
        const { nombre, descripcion, permisos } = req.body;

        const rolExistente = await Rol.findOne({ nombre });
        if (rolExistente) {
            return res.status(400).json({ msg: 'El rol ya existe' });
        }

        const rol = new Rol({
            nombre,
            descripcion,
            permisos,
            estado: true
        });

        await rol.save();

        res.json({ msg: 'Rol creado correctamente', rol });

    } catch (error) {
        res.status(500).json({ msg: 'Error al crear rol', error });
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

        res.json(rolesFormateados);

    } catch (error) {
        res.status(500).json({ msg: 'Error al listar roles', error });
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