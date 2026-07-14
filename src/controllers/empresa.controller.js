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

const obtenerInfoEmpresa = async (req, res) => {
  try {
    const empresaId = req.usuario?.empresaId;

    if (!empresaId) {
      return res.status(400).json({ msg: 'Empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ msg: 'Empresa no encontrada' });
    }

    res.json({
      success: true,
      empresa
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener información de la empresa' });
  }
};

const actualizarInfoEmpresa = async (req, res) => {
  try {
    const empresaId = req.usuario?.empresaId;
    const { nombre, nit, direccion, telefono, email, logo, horarios, configuracionComisiones } = req.body;

    if (!empresaId) {
      return res.status(400).json({ msg: 'Empresa no identificada' });
    }

    const empresa = await Empresa.findById(empresaId);
    if (!empresa) {
      return res.status(404).json({ msg: 'Empresa no encontrada' });
    }

    // Actualizar campos si se proporcionan (con sanitización)
    if (nombre) empresa.nombre = nombre;
    if (nit !== undefined) empresa.nit = nit;
    if (direccion !== undefined) empresa.direccion = direccion;
    if (telefono !== undefined) empresa.telefono = telefono;
    if (email !== undefined) empresa.email = email;
    if (logo !== undefined) empresa.logo = logo;
    if (horarios !== undefined) {
      if (Array.isArray(horarios)) {
        empresa.horarios = horarios;
      } else {
        return res.status(400).json({ msg: 'El formato de horarios es inválido' });
      }
    }
    if (configuracionComisiones !== undefined) {
      if (typeof configuracionComisiones === 'object') {
        empresa.configuracionComisiones = {
          ...empresa.configuracionComisiones,
          ...configuracionComisiones
        };
      }
    }

    await empresa.save();

    res.json({
      success: true,
      msg: 'Información de la empresa actualizada correctamente',
      empresa
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al actualizar información de la empresa', error: error.message });
  }
};

module.exports = {
  toggleAgendamiento,
  obtenerEstadoAgendamiento,
  obtenerInfoEmpresa,
  actualizarInfoEmpresa
};
