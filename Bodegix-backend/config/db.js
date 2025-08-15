// Conexión Sequelize (MySQL)
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    timezone: process.env.DB_TIMEZONE || '+00:00',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
          }
        : undefined
    },
    define: {
      underscored: true,     // created_at / updated_at
      timestamps: true
    }
  }
);

module.exports = sequelize; // <- OJO: export default (coincide con models/index.js)
