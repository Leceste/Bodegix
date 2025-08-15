// reader_keyboard.js
const axios = require('axios');
const readline = require('readline');

const API_URL = 'http://localhost:5000/api/qr/scan';

// Nueva función para extraer el rawCode aunque el lector altere los caracteres
function extractRawCode(v) {
  if (!v) return '';
  const s = String(v).trim();

  // Caso 1: Formato BODEGIX|OPEN|<code>
  if (s.includes('|')) {
    const parts = s.split('|');
    return parts[parts.length - 1];
  }

  // Caso 2: Formato URL normal (http...c=<code>)
  const normalMatch = s.match(/c=([A-Fa-f0-9]{16,64})/);
  if (normalMatch) return normalMatch[1];

  // Caso 3: Lector alteró símbolos → buscar patrón hex largo al final
  const hexMatch = s.match(/([A-Fa-f0-9]{16,64})$/);
  if (hexMatch) return hexMatch[1];

  return '';
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📡 Escaneando...');

rl.on('line', async (scan) => {
  const qrCode = extractRawCode(scan);
  if (!qrCode) {
    console.log('⚠️ No se pudo extraer código válido del escaneo.');
    return;
  }

  console.log(`📷 Código crudo extraído: ${qrCode}`);

  try {
    const res = await axios.post(API_URL, { code: qrCode });
    console.log('✅ Respuesta backend:', res.data);
  } catch (error) {
    console.error('❌ Error enviando al backend:', error.response?.data || error.message);
  }
});
