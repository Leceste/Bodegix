import axios from 'axios';

// 1) Lee de env (CRA) y cae a localhost en dev
const RAW = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// 2) Normaliza para que siempre termine en /api (evita dobles o faltantes)
const baseURL = RAW.endsWith('/api')
  ? RAW
  : `${RAW.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
  // timeout: 10000, // opcional
});

// Adjunta token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// (opcional) Maneja 401 automático:
// api.interceptors.response.use(
//   r => r,
//   (err) => {
//     if (err?.response?.status === 401) {
//       localStorage.removeItem('token');
//       window.location.href = '/login';
//     }
//     return Promise.reject(err);
//   }
// );

export default api;