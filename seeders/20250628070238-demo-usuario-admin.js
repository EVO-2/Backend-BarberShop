const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('123456', 10); // contraseña por defecto

    await queryInterface.bulkInsert('Usuarios', [
      {
        nombre: 'Administrador',
        correo: 'admin@correo.com',
        password: hashedPassword,
        rol: 'admin',
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Barbero Ejemplo',
        correo: 'barbero@correo.com',
        password: hashedPassword,
        rol: 'barbero',
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        nombre: 'Cliente Ejemplo',
        correo: 'cliente@correo.com',
        password: hashedPassword,
        rol: 'cliente',
        estado: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Usuarios', null, {});
  }
};
