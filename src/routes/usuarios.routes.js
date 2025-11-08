import express from 'express';
import { 
  listarUsuarios, 
  obtenerUsuario, 
  actualizarUsuarioController, 
  desactivarUsuarioController,
  reactivarUsuarioController
} from '../controllers/usuarios/usuarios.controller.js';
import { verifyToken, requireAdmin } from '../middlewares/auth.js';
import { listarRoles, listarEstatus } from '../controllers/usuarios/roles.controller.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de administrador
router.use(verifyToken, requireAdmin);

router.get('/', listarUsuarios);
router.get('/roles', listarRoles); // Nueva ruta para obtener roles
router.get('/estatus', listarEstatus); // Nueva ruta para obtener estatus
router.get('/:id', obtenerUsuario);
router.put('/:id', actualizarUsuarioController);
router.delete('/:id', desactivarUsuarioController);
router.put('/:id/reactivar', reactivarUsuarioController);

export default router;