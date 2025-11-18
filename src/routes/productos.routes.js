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

router.get("/tipoproducto", getTipoProducto);
router.get("/laboratorios/list", getLaboratorios);
router.get("/estatus/list", getEstatusProductos);
router.get("/prioridades/list", getPrioridades);
router.get("/update-estatus", updateProductosEstatus);
router.get("/", getProductos); // Leer todos los productos
router.post("/", createProducto); // Crear producto
router.get("/:id/tendencia", getProductoStockTrend); 
router.post("/:id/imagen", upload.single("imagen"), updateProductoImagen);
router.get("/:id", getProductoById); // Leer un producto por ID
router.put("/:id", updateProducto); // Actualizar producto
router.delete("/:id", deleteProducto); // Eliminar producto

export default router;