const { Schema, model } = require('mongoose');

const TemperaturaSchema = new Schema({
  locker_id: { type: String, required: true, index: true }, // LOCKER_XXX
  temperatura: { type: Number, required: true },
  humedad: { type: Number, required: true },
  peso: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now, index: true }
}, {
  versionKey: false,
  collection: 'temperaturas'
});

TemperaturaSchema.index({ locker_id: 1, timestamp: -1 });

module.exports = model('Temperatura', TemperaturaSchema);
