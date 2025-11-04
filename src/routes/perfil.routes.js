import express from 'express';
import { obtenerPerfil, actualizarPerfil } from '../controllers/usuarios/perfil.controller.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', obtenerPerfil);
router.put('/', actualizarPerfil);

export default router;