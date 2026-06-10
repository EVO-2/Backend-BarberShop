const HistorialAcceso = require('../models/HistorialAcceso.model');

class HistorialService {
    /**
     * Registra una acción en el sistema
     * @param {Object} data 
     * @param {String} data.usuario - ID del usuario que realiza la acción
     * @param {String} data.accion - Acción (LOGIN, LOGOUT, CREAR, ACTUALIZAR, ELIMINAR, etc)
     * @param {String} data.modulo - Módulo afectado (AUTENTICACION, CITAS, USUARIOS, etc)
     * @param {String} data.descripcion - Descripción de la acción
     * @param {String} [data.entidadId] - ID del registro modificado
     * @param {Object} [data.detalles] - JSON con los datos (ej: { old: {...}, new: {...} })
     * @param {String} [data.ip] - Dirección IP
     * @param {String} [data.dispositivo] - User agent o dispositivo
     * @param {Boolean} [data.exito=true] - Si la acción fue exitosa
     */
    static async registrarAccion(data) {
        try {
            if (!data.empresaId && data.usuario) {
                const Usuario = require('../models/Usuario.model');
                const usuario = await Usuario.findById(data.usuario);
                if (usuario && usuario.empresaId) {
                    data.empresaId = usuario.empresaId;
                }
            }
            const nuevoRegistro = new HistorialAcceso(data);
            await nuevoRegistro.save();
            return nuevoRegistro;
        } catch (error) {
            // Se registra en la consola del servidor pero no se lanza para no interrumpir el flujo del negocio
            console.error('[Auditoría] Error al registrar historial de acceso:', error.message);
        }
    }

    /**
     * Obtiene el historial de acciones con filtros opcionales
     */
    static async obtenerHistorial(filtros = {}, limite = 100, saltar = 0) {
        try {
            const historial = await HistorialAcceso.find(filtros)
                .populate('usuario', 'nombre apellido correo rol_id')
                .sort({ fecha: -1 })
                .skip(saltar)
                .limit(limite);
            
            const total = await HistorialAcceso.countDocuments(filtros);
            return { historial, total };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = HistorialService;
