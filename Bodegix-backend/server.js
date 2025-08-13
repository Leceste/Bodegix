// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();

// Middlewares
app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000'], credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Conexión a MongoDB Atlas
const uri = process.env.MONGO_URI; // definido en .env
mongoose.connect(uri)
  .then(() => console.log('✅ MongoDB Atlas conectado'))
  .catch((err) => {
    console.error('❌ Error conectando a MongoDB:', err.message);
    process.exit(1);
  });

// Rutas
app.get('/', (_req, res) => res.send('API OK'));
app.use('/api/temperaturas', require('./routes/temperaturas'));

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Arrancar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 API escuchando en http://localhost:${PORT}`));
