import request from 'supertest';
import app from '../src/app.js'; 

describe('API de Reportes - /api/reportes', () => {

  it('GET /estadisticas - debe devolver las estadísticas generales', async () => {
    const response = await request(app)
      .get('/api/reportes/estadisticas');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('todos');
    expect(response.body.data).toHaveProperty('reactivo');
  });

  it('GET /productos - debe devolver la lista de productos paginada', async () => {
    const response = await request(app)
      .get('/api/reportes/productos?page=1&limit=10');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.pagination).toHaveProperty('page', 1);
  });

  it('GET /productos - debe filtrar por tipo de producto', async () => {
    const response = await request(app)
      .get('/api/reportes/productos?tipoProducto=reactivo');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);

    const todosSonReactivos = response.body.data.every(
      (prod) => prod.tipo === 'reactivo'
    );
    expect(todosSonReactivos).toBe(true);
  });

  it('GET /exportar/excel - debe devolver un archivo Excel', async () => {
    const response = await request(app)
      .get('/api/reportes/exportar/excel');
  
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   expect(response.headers['content-disposition']).toContain('reporte-inventario-');
  }); 

});