import { 
  obtenerTodosLosUsuarios, 
  obtenerUsuarioPorId, 
  actualizarUsuario, 
  eliminarUsuario,
  buscarUsuarioPorCorreo 
} from '../../models/usuario.model.js';
import { hashPassword } from '../../utils/passwordUtils.js';

export const listarUsuarios = async (req, res) => {
  try {
    console.log('🔍 Intentando listar usuarios...'); // ← AGREGAR
    const usuarios = await obtenerTodosLosUsuarios();
    console.log('✅ Usuarios obtenidos:', usuarios); // ← AGREGAR
    
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

export const eliminarUsuarioController = async (req, res) => {
  try {
    const { id } = req.params;

    // Evitar que un usuario se elimine a sí mismo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'No puedes eliminar tu propio usuario'
      });
    }

    const eliminado = await eliminarUsuario(id);
    
    if (!eliminado) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};