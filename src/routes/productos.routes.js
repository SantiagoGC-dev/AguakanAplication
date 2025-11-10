import { Router } from "express";
import {
  getProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  getTipoProducto,
  getLaboratorios,
  getEstatusProductos,
  updateProductosEstatus,
  getPrioridades,
  updateProductoImagen,
  getProductoStockTrend, 
} from "../controllers/productos.controller.js";
import upload from "../middlewares/upload.js";

const router = Router();

// --- RUTAS ESPECÍFICAS (deben ir primero) ---

// Rutas de listados y utilidades
router.get("/tipoproducto", getTipoProducto);
router.get("/laboratorios/list", getLaboratorios);
router.get("/estatus/list", getEstatusProductos);
router.get("/prioridades/list", getPrioridades);

// ✅ CORREGIDO: Se quitó el prefijo "/productos"
router.get("/update-estatus", updateProductosEstatus);

// Rutas base de productos (raíz)
router.get("/", getProductos); // Leer todos los productos
router.post("/", createProducto); // Crear producto

// --- RUTAS DINÁMICAS (usan :id y van después) ---

// Rutas específicas de un producto (más específicas que /:id solo)

// ✅ CORREGIDO: Se quitó el prefijo "/productos"
router.get("/:id/tendencia", getProductoStockTrend); 

router.post("/:id/imagen", upload.single("imagen"), updateProductoImagen);

// Rutas genéricas de /:id (deben ir al final de las GET)
router.get("/:id", getProductoById); // Leer un producto por ID
router.put("/:id", updateProducto); // Actualizar producto
router.delete("/:id", deleteProducto); // Eliminar producto

export default router;