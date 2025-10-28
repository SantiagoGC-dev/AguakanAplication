import express from "express";
import { 
  upload, 
  uploadDocumento, 
  getDocumentosByProducto,
  deleteDocumento
} from "../controllers/documentos.controller.js";

const router = express.Router();

// Subir documento
router.post("/upload/:id_producto/:id_tipo_documento", upload.single("archivo"), uploadDocumento);

// Obtener documentos de un producto  
router.get("/producto/:id_producto", getDocumentosByProducto);

// Borrar documento
router.delete("/:id_documento", deleteDocumento);

export default router;