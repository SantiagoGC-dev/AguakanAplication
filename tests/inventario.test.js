import request from 'supertest';
import app from '../src/app.js'; // Importamos la app principal
import pool from '../src/config/db.js'; // Importamos el pool para cerrarlo al final

// --- Variables Globales para este Test ---
let token; // Aquí guardaremos el token de autenticación
let testProductId; // Aquí guardaremos el ID del producto que creemos

// -----------------------------------------------------------------
// 1. ANTES DE TODAS LAS PRUEBAS: Obtenemos un token de Admin
// -----------------------------------------------------------------
beforeAll(async () => {
  // ✅ DATOS REALES (de tu BD de prueba)
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'cignacio@aguakan.com', // Asumiendo que este es tu admin
      password: 'Password123'         // Tu contraseña real
    });

  token = loginResponse.body.token; // Guardamos el token
  
  if (!token) {
    throw new Error('No se pudo obtener el token. Revisa las credenciales de beforeAll.');
  }
});

// -----------------------------------------------------------------
// 3. INICIO DE LAS PRUEBAS DE INVENTARIO
// -----------------------------------------------------------------
describe('API de Inventario - /api/productos', () => {

  // --- PRUEBA CREATE (Crear) ---
  it('POST / - debe crear un nuevo producto (Reactivo)', async () => {
    
    // ✅ OBJETO COMPLETO (basado en tu controller createProducto)
    // Vamos a crear un Reactivo (id_tipo_producto: 1)
    const nuevoProducto = {
      nombre: 'Reactivo de Prueba (Jest)',
      marca: 'Marca Jest',
      lote: 'LOTE-JEST-123',
      existencia_actual: 100,
      stock_minimo: 10,
      imagen: 'default.png',
      id_tipo_producto: 1, // 1 = Reactivo
      id_prioridad: 2, // 2 = Media
      id_usuario: 1, // Tu controller lo usa para el Movimiento
      // --- Datos de Reactivo ---
      presentacion: '500ml',
      caducidad: '2026-12-31'
      // --- (Campos de Equipo se omiten) ---
    };

    const response = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`) // Nos autenticamos
      .send(nuevoProducto);

    // Afirmaciones
    expect(response.statusCode).toBe(201); // 201 = Creado
    expect(response.body).toHaveProperty('id'); // Tu controller devuelve 'id'
    expect(response.body.message).toBe('Producto creado exitosamente');

    // Guardamos el ID para usarlo en las siguientes pruebas
    testProductId = response.body.id; 
    
    // Verificación opcional de la BD (más avanzada)
    const [rows] = await pool.query("SELECT * FROM Reactivo WHERE id_producto = ?", [testProductId]);
    expect(rows.length).toBe(1);
    expect(rows[0].presentacion).toBe('500ml');
  });

  // --- PRUEBA READ (Obtener Todos) ---
  it('GET / - debe devolver una lista de todos los productos', async () => {
    const response = await request(app)
      .get('/api/productos')
      // ✅ Sin token, ¡porque es pública!
      ; 

    // Afirmaciones
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.products)).toBe(true); // Tu controller devuelve { products: [...] }
    expect(response.body.products.length).toBeGreaterThan(0); 
  });

  // --- PRUEBA READ (Obtener Uno) ---
  it('GET /:id - debe devolver un producto específico', async () => {
    // Usamos el ID del producto que acabamos de crear
    const response = await request(app)
      .get(`/api/productos/${testProductId}`)
      .set('Authorization', `Bearer ${token}`); // Asumimos que esta sí requiere token

    // Afirmaciones
    expect(response.statusCode).toBe(200);
    expect(response.body.id_producto).toBe(testProductId);
    expect(response.body.marca).toBe('Marca Jest');
    expect(response.body.presentacion).toBe('500ml'); // Verificamos el JOIN
  });

  // --- PRUEBA UPDATE (Actualizar) ---
  it('PUT /:id - debe actualizar un producto específico', async () => {
    
    // ✅ OBJETO COMPLETO (basado en tu controller updateProducto)
    // Tu PUT espera el objeto completo para actualizar todas las tablas
    const datosActualizados = {
      nombre: 'Reactivo de Prueba (ACTUALIZADO)', // <--- CAMBIO
      marca: 'Marca Jest',
      lote: 'LOTE-JEST-123-UPDATED', // <--- CAMBIO
      existencia_actual: 150, // <--- CAMBIO
      stock_minimo: 20, // <--- CAMBIO
      id_estatus_producto: 1, // (Disponible)
      imagen: 'default.png',
      id_prioridad: 1, // <--- CAMBIO (Alta)
      id_tipo_producto: 1, // Sigue siendo Reactivo
      // --- Datos de Reactivo ---
      presentacion: '500ml (Actualizado)', // <--- CAMBIO
      caducidad: '2027-01-01' // <--- CAMBIO
    };

    const response = await request(app)
      .put(`/api/productos/${testProductId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(datosActualizados);

    // Afirmaciones (basadas en tu controller)
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Producto actualizado exitosamente');

    // (Opcional) Verificamos que los datos se actualizaron en la BD
    const [rows] = await pool.query(
      "SELECT p.nombre, p.stock_minimo, r.presentacion FROM Producto p JOIN Reactivo r ON p.id_producto = r.id_producto WHERE p.id_producto = ?", 
      [testProductId]
    );
    expect(rows[0].nombre).toBe('Reactivo de Prueba (ACTUALIZADO)');
    expect(rows[0].stock_minimo).toBe(20);
    expect(rows[0].presentacion).toBe('500ml (Actualizado)');
  });

});