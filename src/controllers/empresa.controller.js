const Empresa = require('../models/Empresa.model');
const pusher = require('../config/pusher');

const toggleAgendamiento = async (req, res) => {
  try {
    const empresaId = req.usuario?.empresaId;
    const { agendamientoAbierto, mensajeCierre } = req.body;

    if (!empresaId) {
      return res.status(400).json({ msg: 'Empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ msg: 'Empresa no encontrada' });
    }

    empresa.agendamientoAbierto = agendamientoAbierto;
    if (mensajeCierre !== undefined) {
      empresa.mensajeCierre = mensajeCierre;
    }

    await empresa.save();

    // Notificar a todos los clientes conectados de esta empresa
    const evento = agendamientoAbierto ? 'agendamiento-abierto' : 'agendamiento-cerrado';
    pusher.trigger(`barberia-channel`, evento, {
      empresaId: empresaId.toString(),
      mensaje: mensajeCierre || 'El agendamiento de citas se encuentra temporalmente cerrado.'
    });

    res.json({
      success: true,
      msg: `El agendamiento ha sido ${agendamientoAbierto ? 'abierto' : 'cerrado'}.`,
      empresa: {
        agendamientoAbierto: empresa.agendamientoAbierto,
        mensajeCierre: empresa.mensajeCierre
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al cambiar estado de agendamiento' });
  }
};

const obtenerEstadoAgendamiento = async (req, res) => {
  try {
    const empresaId = req.usuario?.empresaId;

    if (!empresaId) {
      return res.status(400).json({ msg: 'Empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId).select('agendamientoAbierto mensajeCierre');
    if (!empresa) {
      return res.status(404).json({ msg: 'Empresa no encontrada' });
    }

    res.json({
      success: true,
      agendamientoAbierto: empresa.agendamientoAbierto,
      mensajeCierre: empresa.mensajeCierre
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener estado de agendamiento' });
  }
};

module.exports = {
  toggleAgendamiento,
  obtenerEstadoAgendamiento
};
