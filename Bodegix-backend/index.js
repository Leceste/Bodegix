// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/index');
const { connectMongo } = require('./config/mongo');

// Rutas MySQL
const planesRoutes = require('./routes/planesRoutes');
const empresasRoutes = require('./routes/empresasRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const usuariosRoutes = require('./routes/usuariosRoutes');
const lockersRoutes = require('./routes/lockersRoutes');
const accesosRoutes = require('./routes/accesosRoutes');
const suscripcionesRoutes = require('./routes/suscripcionesRoutes');
const eventosRoutes = require('./routes/eventosRoutes');
const loginMovilRoutes = require('./routes/loginMovilRoute');
const paypalRoutes = require('./routes/paypalRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const lockersSensorsRoutes = require('./routes/lockersSensorsRoutes');
const alertasRoutes = require('./routes/alertasRoutes');

// Rutas Mongo (API agrupada + compat para la app móvil)
const { api: temperaturasRouter, compat: temperaturaCompat } = require('./routes/temperaturas');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Healthcheck (opcional)
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Registrar rutas MySQL
app.use('/api/planes', planesRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/lockers', lockersRoutes);
app.use('/api/accesos', accesosRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/eventos', eventosRoutes);
app.use('/api/movil', loginMovilRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api', lockersSensorsRoutes);

// Registrar rutas Mongo
app.use('/api/temperaturas', temperaturasRouter);
app.use('/api', temperaturaCompat);

// Conexión y arranque
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await sequelize.sync({ alter: false });
    console.log('✅ Base de datos MySQL conectada y sincronizada');

    await connectMongo(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lockers_iot');
    console.log('✅ Conectado a MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Bodegix backend corriendo en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
})();
