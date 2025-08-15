const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Suscripcion = sequelize.define('Suscripcion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  estado: { type: DataTypes.ENUM('activa','inactiva','vencida','pendiente'), defaultValue: 'pendiente' },
  fecha_inicio: { type: DataTypes.DATE, allowNull: true },
  fecha_fin: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'suscripciones'
});

module.exports = Suscripcion;
