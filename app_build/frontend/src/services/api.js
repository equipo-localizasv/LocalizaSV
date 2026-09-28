import axios from 'axios';

// Soporte universal para Vite (import.meta.env), CRA (process.env) y detección inteligente de host
const getApiBaseUrl = () => {
  // 1. Variable de entorno Vite
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // 2. Variable de entorno Node/CRA segura (sin romper en navegador)
  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
      if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
    }
  } catch (e) {}
  // 3. Detección automática en desarrollo local
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
  }
  // 4. URL de producción en Railway
  return 'https://localizasv-production.up.railway.app/api';
};

const API_BASE_URL = getApiBaseUrl();
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const registerDeviceToken = (token) => {
  return api.post('/notifications/register-token', { token });
};

export default api;
export { API_BASE_URL };
