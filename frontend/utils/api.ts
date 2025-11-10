// utils/api.ts
import axios from 'axios';
import { storage } from './storage'; 
// 🔥 Usamos la IP de tu backend
const API_BASE_URL = "http://172.20.10.11:3000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Esto se ejecuta ANTES de CUALQUIER petición.
api.interceptors.request.use(
  async (config) => {

    const token = await storage.getToken();
    if (token) {
      // Si el token existe, lo añadimos a los headers
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// (Opcional) Puedes añadir un interceptor de respuesta
// para manejar errores 401 (token expirado) y forzar un logout.

export default api;