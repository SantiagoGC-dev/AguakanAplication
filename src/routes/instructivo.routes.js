// routes/instructivo.routes.js
import express from 'express';
import {
  uploadInstructivo,
  actualizarInstructivo,
  obtenerInstructivo,
  eliminarInstructivo
} from '../controllers/instructivo.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Ruta pública (o para todos los logueados) para ver
router.get('/', verifyToken, obtenerInstructivo);

// Rutas de Admin para gestionar
router.post('/', verifyToken, requireAdmin, uploadInstructivo, actualizarInstructivo);
router.delete('/', verifyToken, requireAdmin, eliminarInstructivo);

export default router;