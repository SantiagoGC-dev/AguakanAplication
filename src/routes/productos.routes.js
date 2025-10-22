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
  updateProductoImagen
} from "../controllers/productos.controller.js";
import upload from '../middlewares/upload.js';

const router = Router();

// Rutas de productos
router.get("/tipoproducto", getTipoProducto); // Obtener tipos de producto
router.get("/", getProductos); // Leer todos los productos
router.get("/:id", getProductoById); // Leer un producto por ID
router.post("/", createProducto); // Crear producto
router.put("/:id", updateProducto); // Actualizar producto
router.delete("/:id", deleteProducto); // Eliminar producto
router.get("/laboratorios/list", getLaboratorios); // Obtener todos los laboratorios
router.get("/estatus/list", getEstatusProductos); // Obtener todos los estatus
router.get("/prioridades/list", getPrioridades); // Obtener todas las prioridades
router.get('/productos/update-estatus', updateProductosEstatus); // Actualizar estatus de productos
router.post('/:id/imagen', upload.single('imagen'), updateProductoImagen); // Para POST


export default router;