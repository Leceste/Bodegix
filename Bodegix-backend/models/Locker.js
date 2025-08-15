const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Locker = sequelize.define('Locker', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  identificador: { type: DataTypes.STRING(50), allowNull: false }, // ej: "001" o "LKR-..."
  ubicacion: { type: DataTypes.STRING(150), allowNull: true },
  estado: { type: DataTypes.ENUM('activo','inactivo'), defaultValue: 'activo' },
  tipo: { type: DataTypes.ENUM('perecederos','no_perecederos'), defaultValue: 'no_perecederos' },
  empresa_id: { type: DataTypes.INTEGER, allowNull: false },
  usuario_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'lockers',
  indexes: [
    { name: 'unq_empresa_identificador', unique: true, fields: ['empresa_id', 'identificador'] }
  ]
});

module.exports = Locker;
