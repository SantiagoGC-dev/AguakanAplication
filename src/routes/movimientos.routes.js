import express from "express";
import {
  getMotivosBaja,
  getHistorialProducto,
  getMovimientos,
  registrarEntrada,
  registrarBaja,
  registrarSalida, 
  getUsuarios
} from "../controllers/movimientos.controller.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();
router.use(verifyToken);

router.get("/motivos-baja", getMotivosBaja);

router.get('/usuarios', getUsuarios);

router.get("/historial/:id_producto", getHistorialProducto);

router.get("/", getMovimientos);

router.post("/entradas", registrarEntrada);

router.post("/bajas", registrarBaja);

router.post('/salidas', registrarSalida); 

export default router;