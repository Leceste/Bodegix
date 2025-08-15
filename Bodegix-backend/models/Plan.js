const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Plan = sequelize.define('Plan', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), allowNull: false },
  lockers: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  precio: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0.00 },
  duracion_meses: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
}, {
  tableName: 'planes'
});

module.exports = Plan;
