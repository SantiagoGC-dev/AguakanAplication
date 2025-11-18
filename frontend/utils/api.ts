import axios from 'axios';
import { storage } from './storage'; 
// IP local de desarrollo
const API_BASE_URL = "http://192.168.0.166:3000/api";

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
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;