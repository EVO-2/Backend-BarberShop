const HistorialService = require('../services/historial.service');

const getHistorial = async (req, res) => {
    try {
        const limite = parseInt(req.query.limite) || 100;
        const saltar = parseInt(req.query.saltar) || 0;
        
        let filtros = {};
        
        if (req.query.modulo) filtros.modulo = req.query.modulo;
        if (req.query.accion) filtros.accion = req.query.accion;
        if (req.query.usuario) filtros.usuario = req.query.usuario;
        
        if (req.query.fechaInicio && req.query.fechaFin) {
            filtros.fecha = {
                $gte: new Date(req.query.fechaInicio),
                $lte: new Date(req.query.fechaFin)
            };
        }

        const data = await HistorialService.obtenerHistorial(filtros, limite, saltar);
        
        res.status(200).json({
            ok: true,
            total: data.total,
            historial: data.historial
        });
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno al obtener el historial de acciones'
        });
    }
};

module.exports = {
    getHistorial
};
