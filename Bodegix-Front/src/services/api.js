// src/services/api.js
import axios from 'axios';

const PROD_HOST = 'https://bodegix-backend.onrender.com';
const isProd =
  typeof window !== 'undefined' &&
  !/^(http:\/\/(localhost|127\.0\.0\.1)|chrome-extension:\/\/)/i.test(window.location.origin);

// 1) Lee env; si no hay:
//    - en prod: cae a tu backend público
//    - en dev: cae a localhost
const RAW =
  process.env.REACT_APP_API_URL ||
  (isProd ? PROD_HOST : 'http://localhost:5000');

// 2) Normaliza para terminar en /api
const baseURL = RAW.endsWith('/api') ? RAW : `${RAW.replace(/\/+$/, '')}/api`;

// 3) Evita prod con localhost
if (isProd && /localhost/i.test(baseURL)) {
  throw new Error(`[API] baseURL inválido en producción: ${baseURL}`);
}

const api = axios.create({ baseURL });

// Adjunta token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

console.log('[API] baseURL =>', baseURL);
export default api;
