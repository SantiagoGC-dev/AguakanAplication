import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.js'; 

let token;
let testProductId; 

beforeAll(async () => {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'cignacio@aguakan.com', 
      password: 'Password123'         
    });

  token = loginResponse.body.token; 
  
  if (!token) {
    throw new Error('No se pudo obtener el token. Revisa las credenciales de beforeAll.');
  }
});

describe('API de Inventario - /api/productos', () => {

  // --- PRUEBA CREATE (Crear) ---
  it('POST / - debe crear un nuevo producto (Reactivo)', async () => {

    const nuevoProducto = {
      nombre: 'Reactivo de Prueba (Jest)',
      marca: 'Marca Jest',
      lote: 'LOTE-JEST-123',
      existencia_actual: 100,
      stock_minimo: 10,
      imagen: 'default.png',
      id_tipo_producto: 1, 
      id_prioridad: 2, 
      id_usuario: 1, 
      presentacion: '500ml',
      caducidad: '2026-12-31'

    };

    const response = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`) 
      .send(nuevoProducto);

    // Afirmaciones
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id'); 
    expect(response.body.message).toBe('Producto creado exitosamente');

    testProductId = response.body.id; 
    
    const [rows] = await pool.query("SELECT * FROM Reactivo WHERE id_producto = ?", [testProductId]);
    expect(rows.length).toBe(1);
    expect(rows[0].presentacion).toBe('500ml');
  });

  it('GET / - debe devolver una lista de todos los productos', async () => {
    const response = await request(app)
      .get('/api/productos')
      ; 

    // Afirmaciones
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.products)).toBe(true); 
    expect(response.body.products.length).toBeGreaterThan(0); 
  });

  // --- PRUEBA READ (Obtener Uno) ---
  it('GET /:id - debe devolver un producto específico', async () => {
    const response = await request(app)
      .get(`/api/productos/${testProductId}`)
      .set('Authorization', `Bearer ${token}`);

    // Afirmaciones
    expect(response.statusCode).toBe(200);
    expect(response.body.id_producto).toBe(testProductId);
    expect(response.body.marca).toBe('Marca Jest');
    expect(response.body.presentacion).toBe('500ml'); 
  });

  // --- PRUEBA UPDATE (Actualizar) ---
  it('PUT /:id - debe actualizar un producto específico', async () => {

    const datosActualizados = {
      nombre: 'Reactivo de Prueba (ACTUALIZADO)', 
      marca: 'Marca Jest',
      lote: 'LOTE-JEST-123-UPDATED', 
      existencia_actual: 150, 
      stock_minimo: 20, 
      id_estatus_producto: 1, 
      imagen: 'default.png',
      id_prioridad: 1, 
      id_tipo_producto: 1, 
      // --- Datos de Reactivo ---
      presentacion: '500ml (Actualizado)', 
      caducidad: '2027-01-01' 
    };

    const response = await request(app)
      .put(`/api/productos/${testProductId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(datosActualizados);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Producto actualizado exitosamente');

    const [rows] = await pool.query(
      "SELECT p.nombre, p.stock_minimo, r.presentacion FROM Producto p JOIN Reactivo r ON p.id_producto = r.id_producto WHERE p.id_producto = ?", 
      [testProductId]
    );
    expect(rows[0].nombre).toBe('Reactivo de Prueba (ACTUALIZADO)');
    expect(rows[0].stock_minimo).toBe(20);
    expect(rows[0].presentacion).toBe('500ml (Actualizado)');
  });

});