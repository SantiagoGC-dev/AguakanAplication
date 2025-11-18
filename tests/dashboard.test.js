import request from 'supertest';
import app from '../src/app.js'; 

describe('API de Dashboard - /api/dashboard', () => {

  it('GET /data - debe devolver el objeto de datos del dashboard', async () => {
    const response = await request(app)
      .get('/api/dashboard/data');

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('stats');
    expect(response.body).toHaveProperty('productosEnUso');
    expect(response.body).toHaveProperty('movimientosRecientes');
    expect(response.body).toHaveProperty('alertas');
  });

});