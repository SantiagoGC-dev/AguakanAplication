import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/jwt.config.js';

export const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const checkRole = (rolesPermitidos) => {
  return (req, res, next) => {
    // VERIFICACIÓN DE USUARIO AUTENTICADO
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'No tienes permisos suficientes para esta acción',
        rol_requerido: rolesPermitidos,
        rol_actual: req.user.rol
      });
    }
    next();
  };
};

//  MIDDLEWARES ESPECÍFICOS
export const requireAdmin = checkRole([1]); //  1 = Administrador
export const requireLaboratorista = checkRole([2]); // 2 = Laboratorista
export const requireAdminOrLaboratorista = checkRole([1, 2]);