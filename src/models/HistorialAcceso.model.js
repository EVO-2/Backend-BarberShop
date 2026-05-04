const { Schema, model } = require('mongoose');

const HistorialAccesoSchema = new Schema({
  usuario: {
    type: Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  accion: {
    type: String,
    required: true,
    enum: ['LOGIN', 'LOGOUT', 'CREAR', 'ACTUALIZAR', 'ELIMINAR', 'INTENTO_FALLIDO', 'LECTURA'],
    default: 'LOGIN'
  },
  modulo: {
    type: String,
    required: true,
    enum: ['AUTENTICACION', 'CITAS', 'USUARIOS', 'INVENTARIO', 'PRODUCTOS', 'SERVICIOS', 'REPORTES', 'SEDES', 'PAGOS', 'CONFIGURACION']
  },
  entidadId: {
    type: Schema.Types.ObjectId,
    required: false // Opcional, solo si la acción afecta un registro específico
  },
  descripcion: {
    type: String,
    required: true // Ej: "Usuario actualizó la cita #1234", "Inicio de sesión exitoso"
  },
  detalles: {
    type: Schema.Types.Mixed, // Almacena el snapshot de los cambios (ej. data anterior vs nueva)
    required: false
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  ip: {
    type: String
  },
  dispositivo: {
    type: String // Ej: "Windows 10 - Chrome"
  },
  exito: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  versionKey: false
});

module.exports = model('HistorialAcceso', HistorialAccesoSchema);
