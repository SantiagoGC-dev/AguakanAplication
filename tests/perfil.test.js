import request from 'supertest';
import app from '../src/app.js'; 
// No necesitamos el pool aquí, no cerramos la conexión

// --- Variables Globales ---
let token;
let adminUserId;

beforeAll(async () => {
  // 1. Iniciar sesión como Admin
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'cignacio@aguakan.com', 
      password: 'Password123'
    });

  token = loginResponse.body.token; 
  adminUserId = loginResponse.body.usuario.id;

  if (!token) {
    throw new Error('No se pudo obtener el token de admin en beforeAll');
  }
});


describe('API de Perfil - /api/perfil', () => {

  it('GET / - debe obtener los datos del perfil del usuario autenticado', async () => {
    const response = await request(app)
      .get('/api/perfil')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.correo).toBe('cignacio@aguakan.com');
  });

  it('PUT / - debe actualizar el perfil del usuario (ej. apellido materno)', async () => {
    const nuevoApellido = `Calderon_TEST_${Date.now()}`;
    const response = await request(app)
      .put('/api/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({
        apellido_materno: nuevoApellido
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    // Verificamos que el apellido materno se haya actualizado en la respuesta
    expect(response.body.data.apellido_materno).toBe(nuevoApellido);
  });
  
  it('PUT / - debe devolver 400 si la contraseña actual es incorrecta', async () => {
    const response = await request(app)
      .put('/api/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({
        password_actual: 'password_incorrecta',
        nueva_password: 'nuevopassword123'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('La contraseña actual es incorrecta');
  });

});