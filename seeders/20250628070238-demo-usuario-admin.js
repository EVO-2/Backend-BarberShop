'use strict';
const bcrypt = require('bcryptjs');


module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('123456', 10);

    await queryInterface.bulkInsert('Usuarios', [{
      nombre: 'Administrador',
      correo: 'admin@correo.com',
      password: hashedPassword,
      rol: 'admin',
      estado: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Usuarios', {
      correo: 'admin@correo.com'
    }, {});
  }
};
