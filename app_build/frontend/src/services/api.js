import axios from 'axios';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3001/api';

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
