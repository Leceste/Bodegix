const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Empresa = sequelize.define('Empresa', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(150), allowNull: false },
  estado: { type: DataTypes.ENUM('activa', 'inactiva'), allowNull: false, defaultValue: 'activa' }
}, {
  tableName: 'empresas'
});

module.exports = Empresa;
