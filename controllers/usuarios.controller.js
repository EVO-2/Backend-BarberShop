// controllers/usuarios.controller.js
const { poolConnect, sql } = require('../config/db');

// Obtener todos los usuarios
exports.getUsuarios = async (req, res) => {
  try {
    await poolConnect;
    const request = new sql.Request();
    const result = await request.query('SELECT * FROM Usuarios');
    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obtener un solo usuario por ID
exports.getUsuarioPorId = async (req, res) => {
  try {
    await poolConnect;
    const request = new sql.Request();
    request.input('id', sql.Int, req.params.id);
    const result = await request.query('SELECT * FROM Usuarios WHERE id = @id');
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Crear un nuevo usuario
exports.crearUsuario = async (req, res) => {
  const { nombre_completo, correo, telefono, password, foto_perfil, rol_id, sede_id } = req.body;
  try {
    await poolConnect;
    const request = new sql.Request();
    request.input('nombre_completo', sql.VarChar(100), nombre_completo);
    request.input('correo', sql.VarChar(100), correo);
    request.input('telefono', sql.VarChar(20), telefono);
    request.input('password', sql.VarChar(255), password); // En producción, cifra con bcrypt
    request.input('foto_perfil', sql.VarChar(255), foto_perfil);
    request.input('rol_id', sql.Int, rol_id);
    request.input('sede_id', sql.Int, sede_id);

    await request.query(`
      INSERT INTO Usuarios (nombre_completo, correo, telefono, password, foto_perfil, rol_id, sede_id)
      VALUES (@nombre_completo, @correo, @telefono, @password, @foto_perfil, @rol_id, @sede_id)
    `);
    res.status(201).json({ message: 'Usuario creado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un usuario
exports.actualizarUsuario = async (req, res) => {
  const { nombre_completo, correo, telefono, password, foto_perfil, rol_id, sede_id } = req.body;
  const { id } = req.params;
  try {
    await poolConnect;
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    request.input('nombre_completo', sql.VarChar(100), nombre_completo);
    request.input('correo', sql.VarChar(100), correo);
    request.input('telefono', sql.VarChar(20), telefono);
    request.input('password', sql.VarChar(255), password);
    request.input('foto_perfil', sql.VarChar(255), foto_perfil);
    request.input('rol_id', sql.Int, rol_id);
    request.input('sede_id', sql.Int, sede_id);

    await request.query(`
      UPDATE Usuarios
      SET nombre_completo = @nombre_completo,
          correo = @correo,
          telefono = @telefono,
          password = @password,
          foto_perfil = @foto_perfil,
          rol_id = @rol_id,
          sede_id = @sede_id
      WHERE id = @id
    `);
    res.json({ message: 'Usuario actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar un usuario
exports.eliminarUsuario = async (req, res) => {
  const { id } = req.params;
  try {
    await poolConnect;
    const request = new sql.Request();
    request.input('id', sql.Int, id);
    await request.query('DELETE FROM Usuarios WHERE id = @id');
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
