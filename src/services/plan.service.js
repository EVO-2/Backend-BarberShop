const Empresa = require('../models/Empresa.model');
const PlanSuscripcion = require('../models/PlanSuscripcion.model');
const Usuario = require('../models/Usuario.model');
const Sede = require('../models/Sede.model');

// ==========================================
// Mapeo por defecto de características por plan
// en caso de que no existan en la DB
// ==========================================
const DEFAULT_PLANS = {
  'trial': { maxPeluqueros: 3, maxSucursales: 1, incluyeBotWhatsApp: false },
  'basico': { maxPeluqueros: 3, maxSucursales: 1, incluyeBotWhatsApp: false },
  'pro': { maxPeluqueros: 10, maxSucursales: 3, incluyeBotWhatsApp: true },
  'premium': { maxPeluqueros: 999, maxSucursales: 999, incluyeBotWhatsApp: true }
};

/**
 * Obtiene las características del plan de una empresa
 * @param {String} empresaId ID de la Empresa
 * @returns {Object} { maxPeluqueros, maxSucursales, incluyeBotWhatsApp }
 */
const obtenerCaracteristicasPlan = async (empresaId) => {
  const empresa = await Empresa.findById(empresaId);
  if (!empresa) throw new Error('Empresa no encontrada');

  const nombrePlan = empresa.plan ? empresa.plan.toLowerCase() : 'trial';

  // Buscar en BD
  const planDb = await PlanSuscripcion.findOne({ nombre: { $regex: new RegExp(`^${nombrePlan}$`, 'i') } });
  
  if (planDb && planDb.caracteristicas) {
    return planDb.caracteristicas;
  }

  // Fallback a constantes si no existe en BD
  return DEFAULT_PLANS[nombrePlan] || DEFAULT_PLANS['trial'];
};

/**
 * Verifica si la empresa puede crear más peluqueros
 */
const verificarLimitePeluqueros = async (empresaId) => {
  const caracteristicas = await obtenerCaracteristicasPlan(empresaId);
  
  // Contar usuarios actuales con rol de peluquero/barbero en la empresa
  // Rol es un ObjectId, necesitamos buscar por nombre de rol o contar los que tienen peluqueroId / son barberos
  // Una forma más genérica es buscar Usuarios con la empresaId cuyo rol tenga permisos de 'Peluquero' o buscar por nombre.
  
  const usuarios = await Usuario.find({ empresaId }).populate('rol');
  let countPeluqueros = 0;

  for (const user of usuarios) {
    const rolName = user.rol?.nombre?.toLowerCase() || '';
    if (rolName === 'barbero' || rolName === 'peluquero' || rolName === 'manicurista') {
      countPeluqueros++;
    }
  }

  if (countPeluqueros >= caracteristicas.maxPeluqueros) {
    throw new Error(`Tu plan actual (${caracteristicas.maxPeluqueros} profesionales max.) no permite agregar más barberos/peluqueros. Mejora tu plan.`);
  }

  return true;
};

/**
 * Verifica si la empresa puede crear más sucursales
 */
const verificarLimiteSucursales = async (empresaId) => {
  const caracteristicas = await obtenerCaracteristicasPlan(empresaId);
  
  const countSedes = await Sede.countDocuments({ empresa: empresaId });

  if (countSedes >= caracteristicas.maxSucursales) {
    throw new Error(`Tu plan actual permite máximo ${caracteristicas.maxSucursales} sucursal(es). Mejora tu plan para agregar más.`);
  }

  return true;
};

module.exports = {
  obtenerCaracteristicasPlan,
  verificarLimitePeluqueros,
  verificarLimiteSucursales
};
