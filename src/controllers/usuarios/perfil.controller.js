import { obtenerUsuarioPorId, actualizarUsuario, buscarUsuarioPorCorreo } from '../../models/usuario.model.js';
import { hashPassword, comparePassword } from '../../utils/passwordUtils.js';

export const obtenerPerfil = async (req, res) => {
  try {
    const usuario = await obtenerUsuarioPorId(req.user.id);
    
    if (!usuario) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

res.json({
      success: true,
      data: {
        id: usuario.id_usuario,
        correo: usuario.correo,
        primer_nombre: usuario.primer_nombre,
        apellido_paterno: usuario.apellido_paterno,
        apellido_materno: usuario.apellido_materno,
        rol: usuario.id_rol, // <-- ¡LA CORRECCIÓN CLAVE!
        estatus: usuario.id_estatus_usuario
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const actualizarPerfil = async (req, res) => {
  try {
    const { correo, primer_nombre, apellido_paterno, apellido_materno, password_actual, nueva_password } = req.body;

    const usuarioActual = await buscarUsuarioPorCorreo(req.user.correo);
    if (!usuarioActual) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Verificar si el correo ya está en uso
    if (correo && correo !== usuarioActual.correo) {
      const usuarioConCorreo = await buscarUsuarioPorCorreo(correo);
      if (usuarioConCorreo) {
        return res.status(409).json({
          success: false,
          error: 'El correo ya está en uso'
        });
      }
    }

    const datosActualizacion = {
      correo: correo || usuarioActual.correo,
      primer_nombre: primer_nombre || usuarioActual.primer_nombre,
      apellido_paterno: apellido_paterno || usuarioActual.apellido_paterno,
      apellido_materno: apellido_materno || usuarioActual.apellido_materno,
      id_rol: usuarioActual.id_rol,
      id_estatus_usuario: usuarioActual.id_estatus_usuario
    };

    // Si se quiere cambiar la contraseña
    if (nueva_password) {
      if (!password_actual) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña actual es requerida para cambiar la contraseña'
        });
      }
      
      // Verificar contraseña actual
      const isCurrentPasswordValid = await comparePassword(password_actual, usuarioActual.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña actual es incorrecta'
        });
      }
      
      datosActualizacion.password = await hashPassword(nueva_password);
    }

    const actualizado = await actualizarUsuario(req.user.id, datosActualizacion);
    
    if (!actualizado) {
      return res.status(400).json({
        success: false,
        error: 'No se pudo actualizar el perfil'
      });
    }

    const usuarioActualizado = await obtenerUsuarioPorId(req.user.id);
    
    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};