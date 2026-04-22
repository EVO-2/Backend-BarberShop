const Proveedor = require('../models/Proveedor.model');
const mongoose = require('mongoose');

// ===============================
// ➕ Crear proveedor
// ===============================
const crearProveedor = async (req, res) => {
  try {
    const { nombre, telefono, email, direccion } = req.body;

    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({
        ok: false,
        mensaje: 'Nombre inválido'
      });
    }

    const existe = await Proveedor.findOne({
      nombre: nombre.trim().toUpperCase()
    });

    if (existe) {
      return res.status(400).json({
        ok: false,
        mensaje: 'El proveedor ya existe'
      });
    }

    const proveedor = new Proveedor({
      nombre: nombre.trim(),
      telefono,
      email,
      direccion
    });

    await proveedor.save();

    res.status(201).json({
      ok: true,
      proveedor
    });

  } catch (error) {
    console.error('❌ ERROR CREAR PROVEEDOR:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al crear proveedor',
      error: error.message
    });
  }
};

// ===============================
// 📋 Obtener proveedores
// ===============================
const obtenerProveedores = async (req, res) => {
  try {
    const { nombre, estado } = req.query;

    let filtros = {};

    // 🔥 Activos por defecto
    filtros.estado = true;

    if (nombre && nombre.trim() !== '') {
      filtros.nombre = { $regex: nombre, $options: 'i' };
    }

    if (estado !== undefined && estado !== '') {
      filtros.estado = estado === 'true';
    }

    const proveedores = await Proveedor.find(filtros)
      .sort({ nombre: 1 })
      .lean();

    res.json({
      ok: true,
      total: proveedores.length,
      proveedores
    });

  } catch (error) {
    console.error('❌ ERROR OBTENER PROVEEDORES:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error obteniendo proveedores',
      error: error.message
    });
  }
};

// ===============================
// 📌 Obtener uno
// ===============================
const obtenerProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID inválido'
      });
    }

    const proveedor = await Proveedor.findById(id).lean();

    if (!proveedor || !proveedor.estado) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Proveedor no encontrado'
      });
    }

    res.json({
      ok: true,
      proveedor
    });

  } catch (error) {
    console.error('❌ ERROR OBTENER PROVEEDOR:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al obtener proveedor',
      error: error.message
    });
  }
};

// ===============================
// ✏️ Actualizar
// ===============================
const actualizarProveedor = async (req, res) => {
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

    const proveedor = await Proveedor.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true
      }
    );

    if (!proveedor) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Proveedor no encontrado'
      });
    }

    res.json({
      ok: true,
      proveedor
    });

  } catch (error) {
    console.error('❌ ERROR ACTUALIZAR PROVEEDOR:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al actualizar proveedor',
      error: error.message
    });
  }
};

// ===============================
// ❌ Eliminar (soft delete)
// ===============================
const eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        ok: false,
        mensaje: 'ID inválido'
      });
    }

    const proveedor = await Proveedor.findByIdAndUpdate(
      id,
      { estado: false },
      { new: true }
    );

    if (!proveedor) {
      return res.status(404).json({
        ok: false,
        mensaje: 'Proveedor no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Proveedor eliminado',
      proveedor
    });

  } catch (error) {
    console.error('❌ ERROR ELIMINAR PROVEEDOR:', error);
    res.status(500).json({
      ok: false,
      mensaje: 'Error al eliminar proveedor',
      error: error.message
    });
  }
};

module.exports = {
  crearProveedor,
  obtenerProveedores,
  obtenerProveedor,
  actualizarProveedor,
  eliminarProveedor
};