import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js'; 
// "describe" agrupa las pruebas para la API de Autenticación
describe('API de Autenticación - /api/auth', () => {

  // Caso de Prueba 1: Login con campos vacíos
  it('POST /login - debe devolver 400 si faltan campos', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'cignacio@aguakan.com' }); // Enviamos solo correo, sin password

    // Afirmaciones
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Correo y contraseña son requeridos');
  });

  // Caso de Prueba 2: Login con password incorrecta
  it('POST /login - debe devolver 401 con password incorrecta', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        correo: 'cignacio@aguakan.com', // ¡Usa un correo que SÍ exista en tu BD DE PRUEBA!
        password: 'password_incorrecto'
      });

    // Afirmaciones
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Credenciales incorrectas');
  });

  // Caso de Prueba 3: Login exitoso
  it('POST /login - debe devolver 200 y un token con credenciales válidas', async () => {

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        correo: 'cignacio@aguakan.com',
        password: 'Password123' 
      });

    // Afirmaciones
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token'); // Verificamos que devuelva un token
    expect(response.body.usuario.correo).toBe('cignacio@aguakan.com');
  });

  afterAll(async () => {
    // Cierra la conexión a la BD después de que TODAS las pruebas terminen
    await pool.end();
  });
});