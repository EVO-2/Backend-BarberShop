const { AsyncLocalStorage } = require('async_hooks');

// Almacenamiento local asíncrono para el ciclo de vida de la petición
const tenantStorage = new AsyncLocalStorage();

const getTenantId = () => tenantStorage.getStore();

// Plugin global de Mongoose
const tenantPlugin = function (schema, options) {
  
  // Función para inyectar automáticamente el filtro por empresa
  const applyTenantFilter = function (next) {
    const empresaId = getTenantId();
    const modelName = this.model?.modelName || this.mongooseCollection?.modelName || 'Desconocido';
    const options = this.getOptions ? this.getOptions() : {};
    
    if (modelName !== 'Empresa' && modelName !== 'Rol' && modelName !== 'Permiso' && !options.bypassTenant) {
      if (empresaId) {
        this.where({ empresaId });
      } else {
        console.warn(`[TENANT WARNING] No tenant context found for ${modelName} query! Data isolation bypassed.`);
      }
    }
    next();
  };

  schema.pre('find', applyTenantFilter);
  schema.pre('findOne', applyTenantFilter);
  schema.pre('countDocuments', applyTenantFilter);
  schema.pre('findOneAndUpdate', applyTenantFilter);
  schema.pre('updateMany', applyTenantFilter);
  schema.pre('deleteOne', applyTenantFilter);
  schema.pre('deleteMany', applyTenantFilter);
  schema.pre('distinct', applyTenantFilter);
  
  schema.pre('aggregate', function (next) {
    const empresaId = getTenantId();
    const modelName = this._model?.modelName || 'Desconocido';
    
    if (modelName !== 'Empresa') {
      if (empresaId) {
        this.pipeline().unshift({ $match: { empresaId } });
      } else {
        console.warn(`[TENANT WARNING] No tenant context found for ${modelName} aggregate! Data isolation bypassed.`);
      }
    }
    next();
  });
};

module.exports = {
  tenantStorage,
  getTenantId,
  tenantPlugin
};
