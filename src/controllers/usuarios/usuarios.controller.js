import { 
  obtenerTodosLosUsuarios, 
  obtenerUsuarioPorId, 
  actualizarUsuario, 
  desactivarUsuario,
  reactivarUsuario,
  buscarUsuarioPorCorreo 
} from '../../models/usuario.model.js';
import { hashPassword } from '../../utils/passwordUtils.js';

export const listarUsuarios = async (req, res) => {
  try {
    console.log('🔍 Intentando listar usuarios...'); 
    const usuarios = await obtenerTodosLosUsuarios(req.user.id);
    console.log('✅ Usuarios obtenidos:', usuarios);
    
    res.json({
      success: true,
      data: usuarios,
      total: usuarios.length
    });
  } catch (error) {
    console.error('❌ Error al listar usuarios:', error); 
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await obtenerUsuarioPorId(id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const actualizarUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const { correo, primer_nombre, apellido_paterno, apellido_materno, id_rol, id_estatus_usuario, password } = req.body;

    // Verificar si el usuario existe
    const usuarioExistente = await obtenerUsuarioPorId(id);
    if (!usuarioExistente) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si el correo ya está en uso por otro usuario
    if (correo && correo !== usuarioExistente.correo) {
      const usuarioConCorreo = await buscarUsuarioPorCorreo(correo);
      if (usuarioConCorreo && usuarioConCorreo.id_usuario !== parseInt(id)) {
        return res.status(409).json({
          success: false,
          error: 'El correo ya está en uso por otro usuario'
        });
      }
    }

    const datosActualizacion = {
      correo: correo || usuarioExistente.correo,
      primer_nombre: primer_nombre || usuarioExistente.primer_nombre,
      apellido_paterno: apellido_paterno || usuarioExistente.apellido_paterno,
      apellido_materno: apellido_materno || usuarioExistente.apellido_materno,
      id_rol: id_rol !== undefined ? id_rol : usuarioExistente.id_rol,
      id_estatus_usuario: id_estatus_usuario !== undefined ? id_estatus_usuario : usuarioExistente.id_estatus_usuario
    };

    // Si se proporciona una nueva contraseña, hashearla
    if (password) {
      datosActualizacion.password = await hashPassword(password);
    }

    const actualizado = await actualizarUsuario(id, datosActualizacion);
    
    if (!actualizado) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo actualizar el usuario'
      });
    }

    const usuarioActualizado = await obtenerUsuarioPorId(id);
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const desactivarUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Evitar que un usuario se desactive a sí mismo
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes desactivar tu propio usuario'
      });
    }

    const desactivado = await desactivarUsuario(userId);
    
    if (!desactivado) {
      return res.status(500).json({
        success: false,
        error: 'No se pudo desactivar el usuario'
      });
    }

    res.json({
      success: true,
      message: 'Usuario desactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const reactivarUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const reactivado = await reactivarUsuario(userId);
    
    if (!reactivado) {
      return res.status(500).json({
        success: false,
        error: 'No se pudo reactivar el usuario'
      });
    }

    res.json({
      success: true,
      message: 'Usuario reactivado exitosamente'
    });
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};