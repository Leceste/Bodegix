const { Schema, model } = require('mongoose');

const temperaturaSchema = new Schema({
  locker_id: { type: String, required: true, index: true },
  temperatura: { type: Number, required: true },
  humedad: { type: Number, required: true },
  peso: { type: Number, required: true },
  timestamp: { type: Date, required: true, index: true },
  updated_at: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
}, { collection: 'temperaturas' });

temperaturaSchema.index({ locker_id: 1, timestamp: -1 });

module.exports = model('Temperatura', temperaturaSchema);
