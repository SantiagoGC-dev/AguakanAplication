import pool from "../config/db.js";
import multer from "multer";
import fs from "fs";

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "./uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Crear nombre único manteniendo la extensión original
    const uniqueName = `doc_${Date.now()}_${Math.random().toString(36).substring(2)}.pdf`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, 
  }
});

//  Subir documento
export const uploadDocumento = async (req, res) => {
  try {
    console.log("📤 Subiendo documento:", req.params);
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: "No se subió ningún archivo PDF" 
      });
    }

    const { id_producto, id_tipo_documento } = req.params;
    
    // Validar que los parámetros sean números válidos
    if (!id_producto || isNaN(id_producto) || !id_tipo_documento || isNaN(id_tipo_documento)) {
      // Eliminar archivo si los parámetros son inválidos
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: "Parámetros inválidos"
      });
    }

    // Guardar en BD
    const [result] = await pool.query(
      `INSERT INTO documentoreactivo (id_producto, id_tipo_documento, nombre_archivo, fecha_subida)
       VALUES (?, ?, ?, NOW())`,
      [id_producto, id_tipo_documento, req.file.filename]
    );

    console.log("✅ Documento guardado en BD con ID:", result.insertId);

    res.json({
      success: true,
      message: "Documento PDF subido correctamente",
      documento: {
        id_documento: result.insertId,
        nombre_archivo: req.file.filename,
        id_tipo_documento: id_tipo_documento,
        fecha_subida: new Date(),
        url: `http://10.147.93.216:3000/uploads/${req.file.filename}`
      }
    });

  } catch (error) {
    console.error("❌ Error al subir documento:", error);
    
    // Eliminar archivo si hubo error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error eliminando archivo temporal:", unlinkError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: "Error al subir documento: " + error.message 
    });
  }
};

// Obtener documentos de un producto
export const getDocumentosByProducto = async (req, res) => {
  try {
    const { id_producto } = req.params;
    
    console.log("📂 Obteniendo documentos para producto:", id_producto);

    // Obtener documentos de la BD
    const [rows] = await pool.query(
      `SELECT 
        id_documento,
        id_producto,
        id_tipo_documento,
        nombre_archivo,
        fecha_subida
       FROM documentoreactivo 
       WHERE id_producto = ? 
       ORDER BY fecha_subida DESC`,
      [id_producto]
    );

    console.log(`✅ Encontrados ${rows.length} documentos para producto ${id_producto}`);

    // Transformar datos para el frontend
    const documentos = rows.map(doc => ({
      id_documento: doc.id_documento,
      id_producto: doc.id_producto,
      id_tipo_documento: doc.id_tipo_documento,
      nombre_archivo: doc.nombre_archivo,
      fecha_subida: doc.fecha_subida,
      url: `http://10.147.93.216:3000/uploads/${doc.nombre_archivo}`,
      tipo: doc.id_tipo_documento == 1 ? "certificado" : "hds"
    }));

    res.json(documentos);

  } catch (error) {
    console.error("❌ Error al obtener documentos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al obtener documentos: " + error.message 
    });
  }
};
// Eliminar documento
export const deleteDocumento = async (req, res) => {
  try {
    const { id_documento } = req.params;
    
    console.log("🗑️ Eliminando documento:", id_documento);

    // 1. Primero obtener información del documento para eliminar el archivo físico
    const [documento] = await pool.query(
      `SELECT nombre_archivo FROM documentoreactivo WHERE id_documento = ?`,
      [id_documento]
    );

    if (documento.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    const nombreArchivo = documento[0].nombre_archivo;
    const filePath = `./uploads/${nombreArchivo}`;

    // 2. Eliminar de la base de datos
    const [result] = await pool.query(
      `DELETE FROM documentoreactivo WHERE id_documento = ?`,
      [id_documento]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "No se pudo eliminar el documento"
      });
    }

    // 3. Eliminar el archivo físico
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("✅ Archivo físico eliminado:", filePath);
      } else {
        console.warn("⚠️ Archivo físico no encontrado:", filePath);
      }
    } catch (fileError) {
      console.error("❌ Error eliminando archivo físico:", fileError);
      // No retornamos error aquí porque ya se eliminó de la BD
    }

    console.log("✅ Documento eliminado correctamente, ID:", id_documento);

    res.json({
      success: true,
      message: "Documento eliminado correctamente",
      id_documento: parseInt(id_documento)
    });

  } catch (error) {
    console.error("❌ Error al eliminar documento:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar documento: " + error.message
    });
  }
};