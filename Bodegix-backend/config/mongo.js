// config/mongo.js
const mongoose = require('mongoose');

async function connectMongo(uri = process.env.MONGO_URI, options = {}) {
  if (!uri) throw new Error('MONGO_URI no definido');
  await mongoose.connect(uri, options);
  console.log(' MongoDB Atlas conectado:', mongoose.connection.host);
  return mongoose.connection;
}

module.exports = { connectMongo }; // <-- export nombrado
