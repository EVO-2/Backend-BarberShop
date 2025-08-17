const PuestoTrabajo = require('../models/PuestoTrabajo.model');
const Peluquero = require('../models/Peluquero.model');

// GET /api/puestos/por-sede/:sedeId
const obtenerPuestos = async (req, res) => {
  try {
    const { sedeId } = req.params;
    const { peluquero_id } = req.query;

    if (!sedeId) {
      return res.status(400).json({ message: 'El parámetro sedeId es obligatorio' });
    }

    console.log(`📌 [obtenerPuestos] Sede: ${sedeId} | Peluquero en edición: ${peluquero_id || 'N/A'}`);

    // Obtener todos los puestos activos de la sede
    const puestos = await PuestoTrabajo.find({ sede: sedeId, estado: true })
    .populate('sede', 'nombre')
    .populate({
      path: 'peluquero',
      select: '_id estado puestoTrabajo usuario',
      populate: {
        path: 'usuario',
        select: 'nombre apellido'
      }
    });


    console.log(`📋 [obtenerPuestos] Puestos encontrados: ${puestos.length}`);

   // ========== MODO CREAR ==========
    if (!peluquero_id) {
      // 🔹 Filtrar solo puestos que tengan peluquero asignado y activo
      const puestosConPeluquero = puestos.filter(
        p => p.peluquero && p.peluquero._id && p.peluquero.estado === true
      );

      const puestosLibres = puestosConPeluquero.map(p => {
        const peluqueroActivo = Boolean(p.peluquero && p.peluquero.estado === true);
        const ocupado = peluqueroActivo;

        console.log(
          `🔍 [CREAR] Puesto "${p.nombre}" | Peluquero asignado: ${p.peluquero?._id || 'ninguno'} | Estado activo: ${p.peluquero?.estado || false} | Ocupado: ${ocupado}`
        );

        return {
          _id: p._id,
          nombre: p.nombre,
          sede: p.sede,
          ocupado
        };
      });

      return res.json(puestosLibres);
    }


    // ========== MODO EDICIÓN ==========
    const puestosDisponibles = puestos.map(p => {
      const esMismoPuesto = p.peluquero?._id?.toString() === peluquero_id;
      const peluqueroActivo = Boolean(p.peluquero && p.peluquero.estado === true);
      const ocupado = peluqueroActivo && !esMismoPuesto;

      console.log(
        `🔍 [EDITAR] Puesto "${p.nombre}" | Peluquero asignado: ${p.peluquero?._id || 'ninguno'} | Estado activo: ${p.peluquero?.estado || false} | Es mismo puesto: ${esMismoPuesto} | Ocupado: ${ocupado}`
      );

      return {
        _id: p._id,
        nombre: p.nombre,
        sede: p.sede,
        ocupado
      };
    });

    return res.json(puestosDisponibles);

  } catch (error) {
    console.error('❌ Error obteniendo puestos:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// PUT /api/puestos/:id/liberar
const liberarPuesto = async (req, res) => {
  try {
    const puesto = await PuestoTrabajo.findById(req.params.id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    puesto.peluquero = null;
    await puesto.save();

    res.json({ message: 'Puesto liberado exitosamente' });
  } catch (error) {
    console.error('❌ Error liberando puesto:', error);
    res.status(500).json({ message: 'Error liberando puesto' });
  }
};

// PUT /api/puestos/:id/asignar
const asignarPuesto = async (req, res) => {
  try {
    const { peluqueroId } = req.body;
    const puesto = await PuestoTrabajo.findById(req.params.id);
    if (!puesto) return res.status(404).json({ message: 'Puesto no encontrado' });

    puesto.peluquero = peluqueroId;
    await puesto.save();

    res.json({ message: 'Peluquero asignado al puesto correctamente' });
  } catch (error) {
    console.error('❌ Error asignando puesto:', error);
    res.status(500).json({ message: 'Error asignando puesto' });
  }
};

module.exports = {
  obtenerPuestos,
  liberarPuesto,
  asignarPuesto
};
