import pool from '../config/db.js';

export const buscarUsuarioPorCorreo = async (correo) => {
  const [rows] = await pool.execute(
    'SELECT * FROM usuario WHERE correo = ? LIMIT 1',
    [correo]
  );
  return rows[0];
};

export const crearUsuario = async (datos) => {
  const { correo, password, primer_nombre, apellido_paterno, apellido_materno, id_rol } = datos;
  const [result] = await pool.execute(
    `INSERT INTO usuario (correo, password, primer_nombre, apellido_paterno, apellido_materno, id_rol, id_estatus_usuario)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [correo, password, primer_nombre, apellido_paterno, apellido_materno, id_rol]
  );
  return result.insertId;
};

// Nuevas funciones para gestión de usuarios
export const obtenerTodosLosUsuarios = async (idUsuarioExcluir) => {
  const [rows] = await pool.execute(`
    SELECT 
      u.id_usuario,
      u.correo,
      u.primer_nombre,
      u.apellido_paterno,
      u.apellido_materno,
      u.id_rol,
      r.nombre_rol,
      u.id_estatus_usuario
    FROM usuario u
    LEFT JOIN rol r ON u.id_rol = r.id_rol
    WHERE u.id_usuario != ? 
    ORDER BY u.id_usuario
  `, [idUsuarioExcluir]); 
  return rows;
};
export const obtenerUsuarioPorId = async (id) => {
  const [rows] = await pool.execute(`
    SELECT 
      u.id_usuario,
      u.correo,
      u.primer_nombre,
      u.apellido_paterno,
      u.apellido_materno,
      u.id_rol,
      r.nombre_rol,
      u.id_estatus_usuario
    FROM usuario u
    LEFT JOIN rol r ON u.id_rol = r.id_rol
    WHERE u.id_usuario = ?
  `, [id]);
  return rows[0];
};

export const actualizarUsuario = async (id, datos) => {
  // Extraer todos los campos posibles, incluyendo 'password'
  const { 
    correo, primer_nombre, apellido_paterno, 
    apellido_materno, id_rol, id_estatus_usuario, 
    password // (Este ya vendrá hasheado desde el controlador)
  } = datos;

  // --- Construcción de consulta dinámica ---
  const fields = [];
  const values = [];

  // Campos que SIEMPRE se actualizan en esta función
  // (Incluso si son los mismos valores)
  fields.push('correo = ?');
  values.push(correo);
  fields.push('primer_nombre = ?');
  values.push(primer_nombre);
  fields.push('apellido_paterno = ?');
  values.push(apellido_paterno);
  fields.push('apellido_materno = ?');
  values.push(apellido_materno);
  fields.push('id_rol = ?');
  values.push(id_rol);
  fields.push('id_estatus_usuario = ?');
  values.push(id_estatus_usuario);
  
  // Campo OPCIONAL de contraseña
  if (password) {
    fields.push('password = ?');
    values.push(password);
  }

  // No olvides el 'id' para el WHERE
  values.push(id);

  const sql = `UPDATE usuario SET ${fields.join(', ')} WHERE id_usuario = ?`;

  const [result] = await pool.execute(sql, values);
  return result.affectedRows > 0;
};

export const desactivarUsuario = async (id) => {
  try {
    // Cambiar estatus a 2 (Inactivo)
    const query = `UPDATE usuario SET id_estatus_usuario = 2 WHERE id_usuario = ?`;
    const [result] = await pool.execute(query, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error al desactivar usuario:', error);
    throw error;
  }
};

// Nueva función para obtener roles disponibles
export const obtenerRoles = async () => {
  const [rows] = await pool.execute('SELECT id_rol, nombre_rol FROM rol ORDER BY id_rol');
  return rows;
};

// Nueva función para obtener estatus de usuario
export const obtenerEstatus = async () => {
  const [rows] = await pool.execute('SELECT id_estatus_usuario, nombre_estatus FROM estatususuario ORDER BY id_estatus_usuario');
  return rows;
};

export const reactivarUsuario = async (id) => {
  try {
    // Cambiar estatus a 1 (Activo)
    const query = `UPDATE usuario SET id_estatus_usuario = 1 WHERE id_usuario = ?`;
    const [result] = await pool.execute(query, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error al reactivar usuario:', error);
    throw error;
  }
};