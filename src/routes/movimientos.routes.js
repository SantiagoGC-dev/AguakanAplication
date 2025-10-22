import express from "express";
import {
  getMotivosBaja,
  getHistorialProducto,
  getMovimientos,
  registrarEntrada,
  registrarBaja,
  registrarSalida, 
} from "../controllers/movimientos.controller.js";

const router = express.Router();

// Obtener todos los motivos de baja
router.get("/motivos-baja", getMotivosBaja);

// MODIFICADO: Esta es la nueva ruta para obtener el historial completo de un producto
// Usa el endpoint: GET /api/movimientos/historial/:id_producto
router.get("/historial/:id_producto", getHistorialProducto);

// Obtener todos los movimientos (para la bitácora general)
router.get("/", getMovimientos);

// Registrar entrada
router.post("/entradas", registrarEntrada);

// Registrar baja
router.post("/bajas", registrarBaja);

// Se agrega la nueva ruta para registrar salidas
router.post('/salidas', registrarSalida); 

export default router;