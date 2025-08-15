const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Acceso = sequelize.define('Acceso', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  usuario_id: { type: DataTypes.INTEGER, allowNull: false },
  locker_id: { type: DataTypes.INTEGER, allowNull: false },
  accion: { type: DataTypes.ENUM('OPEN','CLOSE'), allowNull: false, defaultValue: 'OPEN' },
  estado: { type: DataTypes.ENUM('exitoso','fallido'), allowNull: false, defaultValue: 'exitoso' },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'accesos'
});

module.exports = Acceso;
