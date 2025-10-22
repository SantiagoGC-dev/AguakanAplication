import express from 'express';
import { 
  getDashboardStats,
  getProductosEnUso,
  getMovimientosRecientes,
  getAlertasDashboard,
  getDashboardData
} from '../controllers/dashboard.controller.js';

const router = express.Router();

// Rutas individuales
router.get('/stats', getDashboardStats);
router.get('/productos-en-uso', getProductosEnUso);
router.get('/movimientos-recientes', getMovimientosRecientes);
router.get('/alertas', getAlertasDashboard);

// Ruta combinada para obtener todos los datos en una sola llamada
router.get('/data', getDashboardData);

export default router;