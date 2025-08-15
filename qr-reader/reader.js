// reader_keyboard.js
const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:5000/api/qr/scan';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📡 Escaneando... (usa tu lector QR)');

rl.on('line', async (qrCode) => {
  qrCode = qrCode.trim();
  if (!qrCode) return;

  console.log(`📷 QR leído: ${qrCode}`);
  try {
    const res = await axios.post(API_URL, { code: qrCode });
    console.log('✅ Respuesta backend:', res.data);
  } catch (error) {
    console.error('❌ Error enviando al backend:', error.response?.data || error.message);
  }
});
