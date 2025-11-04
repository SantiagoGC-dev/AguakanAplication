import express from 'express';
import { 
  listarUsuarios, 
  obtenerUsuario, 
  actualizarUsuarioController, 
  eliminarUsuarioController 
} from '../controllers/usuarios/usuarios.controller.js';
import { listarRoles } from '../controllers/usuarios/roles.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de administrador
router.use(verifyToken, requireAdmin);

router.get('/', listarUsuarios);
router.get('/roles', listarRoles); // Nueva ruta para obtener roles
router.get('/:id', obtenerUsuario);
router.put('/:id', actualizarUsuarioController);
router.delete('/:id', eliminarUsuarioController);

export default router;