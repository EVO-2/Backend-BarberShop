const Categoria = require('../models/Categoria.model');
const mongoose = require('mongoose');

// ===============================
// ➕ Crear categoría
// ===============================
const crearCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre || nombre.trim().length < 2) {
            return res.status(400).json({
                ok: false,
                mensaje: 'Nombre inválido'
            });
        }

        const nombreNormalizado = nombre.trim().toUpperCase();

        const existe = await Categoria.findOne({
            nombre: nombreNormalizado
        });

        if (existe) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La categoría ya existe'
            });
        }

        const categoria = new Categoria({
            nombre: nombreNormalizado,
            descripcion
        });

        await categoria.save();

        res.status(201).json({
            ok: true,
            categoria
        });

    } catch (error) {
        console.error('❌ ERROR CREAR CATEGORIA:', error);

        // 🔥 Manejo de duplicado por índice único (Mongo)
        if (error.code === 11000) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La categoría ya existe'
            });
        }

        res.status(500).json({
            ok: false,
            mensaje: 'Error al crear categoría',
            error: error.message
        });
    }
};

// ===============================
// 📋 Obtener categorías
// ===============================
const obtenerCategorias = async (req, res) => {
    try {
        const { nombre, estado } = req.query;

        let filtros = {};

        // 🔥 Activas por defecto
        filtros.estado = true;

        if (nombre && nombre.trim() !== '') {
            filtros.nombre = { $regex: nombre, $options: 'i' };
        }

        if (estado !== undefined && estado !== '') {
            filtros.estado = estado === 'true';
        }

        const categorias = await Categoria.find(filtros)
            .sort({ nombre: 1 })
            .lean();

        res.json({
            ok: true,
            total: categorias.length,
            categorias
        });

    } catch (error) {
        console.error('❌ ERROR OBTENER CATEGORIAS:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error obteniendo categorías',
            error: error.message
        });
    }
};

// ===============================
// 📌 Obtener una
// ===============================
const obtenerCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

        const categoria = await Categoria.findById(id).lean();

        if (!categoria || !categoria.estado) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Categoría no encontrada'
            });
        }

        res.json({
            ok: true,
            categoria
        });

    } catch (error) {
        console.error('❌ ERROR OBTENER CATEGORIA:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al obtener categoría',
            error: error.message
        });
    }
};

// ===============================
// ✏️ Actualizar
// ===============================
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

        if (data.nombre) {
            data.nombre = data.nombre.trim().toUpperCase();
        }

        const categoria = await Categoria.findByIdAndUpdate(
            id,
            data,
            {
                new: true,
                runValidators: true
            }
        );

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Categoría no encontrada'
            });
        }

        res.json({
            ok: true,
            categoria
        });

    } catch (error) {
        console.error('❌ ERROR ACTUALIZAR CATEGORIA:', error);

        // 🔥 Manejo duplicado también en update
        if (error.code === 11000) {
            return res.status(400).json({
                ok: false,
                mensaje: 'La categoría ya existe'
            });
        }

        res.status(500).json({
            ok: false,
            mensaje: 'Error al actualizar categoría',
            error: error.message
        });
    }
};

// ===============================
// ❌ Eliminar (soft delete)
// ===============================
const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                ok: false,
                mensaje: 'ID inválido'
            });
        }

        const categoria = await Categoria.findByIdAndUpdate(
            id,
            { estado: false },
            { new: true }
        );

        if (!categoria) {
            return res.status(404).json({
                ok: false,
                mensaje: 'Categoría no encontrada'
            });
        }

        res.json({
            ok: true,
            mensaje: 'Categoría eliminada',
            categoria
        });

    } catch (error) {
        console.error('❌ ERROR ELIMINAR CATEGORIA:', error);
        res.status(500).json({
            ok: false,
            mensaje: 'Error al eliminar categoría',
            error: error.message
        });
    }
};

module.exports = {
    crearCategoria,
    obtenerCategorias,
    obtenerCategoria,
    actualizarCategoria,
    eliminarCategoria
};