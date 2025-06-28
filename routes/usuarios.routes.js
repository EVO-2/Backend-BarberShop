// routes/usuarios.routes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Ruta de prueba para verificar conexión a la base de datos
router.get('/test-db', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT GETDATE() AS fecha_actual');
    res.json({
      mensaje: 'Conexión exitosa a la base de datos ✅',
      resultado: result.recordset[0]
    });
  } catch (error) {
    res.status(500).json({
      mensaje: '❌ Error al conectar con la base de datos',
      error: error.message
    });
  }
});

module.exports = router;
