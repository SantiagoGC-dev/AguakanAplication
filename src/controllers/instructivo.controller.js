import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = './uploads';
const pdfFileName = 'instructivo_trabajo.pdf'; 
const pdfFilePath = path.join(uploadDir, pdfFileName);

// --- Configuración de Multer (para subir) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, pdfFileName)
});

export const uploadInstructivo = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Solo se permiten archivos PDF'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 } 
}).single('instructivo'); 

// --- Controladores de API ---
// POST (Subir o Actualizar)
export const actualizarInstructivo = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No se subió PDF" });
  }
  console.log('✅ Instructivo actualizado:', req.file.filename);
  res.json({
    success: true,
    message: 'Instructivo actualizado',
    url: `http://192.168.167.216:3000/uploads/${pdfFileName}` // TU IP
  });
};

// GET (Consultar)
export const obtenerInstructivo = (req, res) => {
  try {
    if (fs.existsSync(pdfFilePath)) {
      res.json({
        success: true,
        url: `http://192.168.167.216:3000/uploads/${pdfFileName}` 
      });
    } else {
      res.json({ success: true, url: null }); 
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al verificar' });
  }
};

// DELETE (Eliminar)
export const eliminarInstructivo = (req, res) => {
  try {
    if (fs.existsSync(pdfFilePath)) {
      fs.unlinkSync(pdfFilePath);
      console.log('✅ Instructivo eliminado');
      res.json({ success: true, message: 'Instructivo eliminado' });
    } else {
      res.status(404).json({ success: false, error: 'No hay instructivo para eliminar' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error al eliminar' });
  }
};