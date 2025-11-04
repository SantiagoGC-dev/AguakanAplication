import { hashPassword, comparePassword } from '../../utils/passwordUtils.js';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../config/jwt.config.js';
import { buscarUsuarioPorCorreo, crearUsuario } from '../../models/usuario.model.js';

export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    // 1. Validaciones básicas
    if (!correo || !password) {
      return res.status(400).json({ 
        error: 'Correo y contraseña son requeridos' 
      });
    }

    // 2. Buscar usuario en la BD
    const usuario = await buscarUsuarioPorCorreo(correo);
    
    if (!usuario) {
      return res.status(401).json({ 
        error: 'Credenciales incorrectas' 
      });
    }

    // 3. Verificar si el usuario está activo
    if (usuario.id_estatus_usuario !== 1) { // Asumiendo 1=activo
      return res.status(401).json({ 
        error: 'Usuario inactivo' 
      });
    }

    // 4. Comparar password con bcrypt
    const isPasswordValid = await comparePassword(password, usuario.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Credenciales incorrectas' 
      });
    }

    // 5. Generar JWT (usando id_rol de la base de datos)
    const token = jwt.sign(
      { 
        id: usuario.id_usuario,
        correo: usuario.correo,
        rol: usuario.id_rol  // Esto debe coincidir con id_rol de la tabla rol
      },
      JWT_CONFIG.secret,
      { expiresIn: JWT_CONFIG.expiresIn }
    );

    // 6. Responder con token y datos del usuario
    res.json({
      token,
      usuario: {
        id: usuario.id_usuario,
        correo: usuario.correo,
        primer_nombre: usuario.primer_nombre,
        apellido_paterno: usuario.apellido_paterno,
        apellido_materno: usuario.apellido_materno,
        rol: usuario.id_rol,  // id_rol numérico
        estatus: usuario.id_estatus_usuario
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const registro = async (req, res) => {
  try {
    const { correo, password, primer_nombre, apellido_paterno, apellido_materno, id_rol } = req.body;

    if (!correo || !password || !primer_nombre) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existente = await buscarUsuarioPorCorreo(correo);
    if (existente) {
      return res.status(409).json({ error: 'El correo ya está registrado' });
    }

    const hashed = await hashPassword(password);
    const idUsuario = await crearUsuario({
      correo,
      password: hashed,
      primer_nombre,
      apellido_paterno,
      apellido_materno,
      id_rol: id_rol || 2, // Por defecto rol 2 = Laboratorista
    });

    res.status(201).json({ 
      mensaje: 'Usuario registrado exitosamente', 
      id_usuario: idUsuario 
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};