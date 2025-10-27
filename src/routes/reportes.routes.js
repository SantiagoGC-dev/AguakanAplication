import express from 'express';
import {
  getReportesProductos,
  getEstadisticasReportes,
  exportarExcel
} from '../controllers/reportes.controller.js';

const router = express.Router();

router.get('/productos', getReportesProductos);
router.get('/estadisticas', getEstadisticasReportes);
router.get('/exportar/excel', exportarExcel);
router.post('/exportar/excel', exportarExcel);

export default router;