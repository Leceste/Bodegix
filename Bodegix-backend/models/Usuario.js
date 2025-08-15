const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING(120), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(200), allowNull: false },
  rol_id: { type: DataTypes.INTEGER, allowNull: false },
  empresa_id: { type: DataTypes.INTEGER, allowNull: true },
  estado: { type: DataTypes.ENUM('activo','inactivo'), defaultValue: 'activo' },
  token: { type: DataTypes.STRING(255), allowNull: true } // si lo usas
}, {
  tableName: 'usuarios'
});

module.exports = Usuario;
