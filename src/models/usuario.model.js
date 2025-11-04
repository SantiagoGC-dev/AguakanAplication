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
export const obtenerTodosLosUsuarios = async () => {
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
    ORDER BY u.id_usuario
  `);
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
  const { correo, primer_nombre, apellido_paterno, apellido_materno, id_rol, id_estatus_usuario } = datos;
  const [result] = await pool.execute(
    `UPDATE usuario 
     SET correo = ?, primer_nombre = ?, apellido_paterno = ?, apellido_materno = ?, id_rol = ?, id_estatus_usuario = ?
     WHERE id_usuario = ?`,
    [correo, primer_nombre, apellido_paterno, apellido_materno, id_rol, id_estatus_usuario, id]
  );
  return result.affectedRows > 0;
};

export const eliminarUsuario = async (id) => {
  const [result] = await pool.execute(
    'DELETE FROM usuario WHERE id_usuario = ?',
    [id]
  );
  return result.affectedRows > 0;
};

// Nueva función para obtener roles disponibles
export const obtenerRoles = async () => {
  const [rows] = await pool.execute('SELECT id_rol, nombre_rol FROM rol ORDER BY id_rol');
  return rows;
};