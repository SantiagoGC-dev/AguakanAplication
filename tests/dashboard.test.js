import request from 'supertest';
import app from '../src/app.js'; 
// No necesitamos el pool aquí, no cerramos la conexión

describe('API de Dashboard - /api/dashboard', () => {

  // Tu controller dashboard.routes.js no tiene verifyToken,
  // así que probamos que la ruta es pública.
  it('GET /data - debe devolver el objeto de datos del dashboard', async () => {
    const response = await request(app)
      .get('/api/dashboard/data');

    expect(response.statusCode).toBe(200);
    // Verificamos que la estructura principal exista
    expect(response.body).toHaveProperty('stats');
    expect(response.body).toHaveProperty('productosEnUso');
    expect(response.body).toHaveProperty('movimientosRecientes');
    expect(response.body).toHaveProperty('alertas');
  });

  // (Podríamos añadir más, pero probar /data prueba todos los controladores a la vez)
});