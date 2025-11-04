import { obtenerRoles, obtenerEstatus } from '../../models/usuario.model.js';

export const listarRoles = async (req, res) => {
  try {
    const roles = await obtenerRoles();
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Error al obtener roles:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const listarEstatus = async (req, res) => {
  try {
    const estatus = await obtenerEstatus();
    res.json({
      success: true,
      data: estatus
    });
  } catch (error) {
    console.error('Error al obtener estatus:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};