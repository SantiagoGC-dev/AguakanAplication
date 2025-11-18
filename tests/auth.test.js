import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js';

describe('API de Autenticación - /api/auth', () => {

  it('POST /login - debe devolver 400 si faltan campos', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'cignacio@aguakan.com' }); 

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Correo y contraseña son requeridos');
  });

  it('POST /login - debe devolver 401 con password incorrecta', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        correo: 'cignacio@aguakan.com', 
        password: 'password_incorrecto'
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Credenciales incorrectas');
  });

  it('POST /login - debe devolver 200 y un token con credenciales válidas', async () => {

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        correo: 'cignacio@aguakan.com',
        password: 'Password123' 
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token'); 
    expect(response.body.usuario.correo).toBe('cignacio@aguakan.com');
  });

  afterAll(async () => {
    await pool.end();
  });
});