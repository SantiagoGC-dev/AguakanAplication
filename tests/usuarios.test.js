import request from 'supertest';
import app from '../src/app.js'; 
import pool from '../src/config/db.js';

let tokenAdmin;

beforeAll(async () => {

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'cignacio@aguakan.com', 
      password: 'Password123'
    });
  tokenAdmin = loginResponse.body.token; 
  if (!tokenAdmin) {
    throw new Error('No se pudo obtener el token de admin en beforeAll');
  }
});

afterAll(async () => {
  await pool.end(); 
});

describe('API de Admin/Usuarios - /api/usuarios', () => {

  it('GET / - debe obtener la lista de usuarios (solo admin)', async () => {
    const response = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
  
  it('GET /roles - debe obtener la lista de roles (solo admin)', async () => {
    const response = await request(app)
      .get('/api/usuarios/roles')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  it('GET /estatus - debe obtener la lista de estatus (solo admin)', async () => {
    const response = await request(app)
      .get('/api/usuarios/estatus')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  it('PUT /:id - debe actualizar un usuario (ej. rol)', async () => {
    const idUsuarioAActualizar = 3; 
    
    const response = await request(app)
      .put(`/api/usuarios/${idUsuarioAActualizar}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        id_rol: 1
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id_rol).toBe(1);
  });
  
  it('DELETE /:id - debe desactivar un usuario (que no sea él mismo)', async () => {

    const idUsuarioADesactivar = 4; 
    
    const response = await request(app)
      .delete(`/api/usuarios/${idUsuarioADesactivar}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  it('PUT /:id/reactivar - debe reactivar un usuario', async () => {
    const idUsuarioAReactivar = 4; 
    
    const response = await request(app)
      .put(`/api/usuarios/${idUsuarioAReactivar}/reactivar`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
  });

});