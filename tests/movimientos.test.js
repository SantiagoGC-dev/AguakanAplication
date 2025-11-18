import request from 'supertest';
import app from '../src/app.js'; 
import pool from '../src/config/db.js'; 

let token; 
let testProductId; 
let adminUserId; 

beforeAll(async () => {
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      correo: 'cignacio@aguakan.com', 
      password: 'Password123'         
    });

  token = loginResponse.body.token; 
  adminUserId = loginResponse.body.usuario.id;

  if (!token || !adminUserId) {
    throw new Error('No se pudo obtener el token o el ID del admin.');
  }

  const nuevoProducto = {
    nombre: 'Reactivo para Prueba de Movimientos',
    marca: 'Marca Movimientos',
    lote: 'LOTE-MOV-123',
    existencia_actual: 10, 
    stock_minimo: 5,
    imagen: 'default.png',
    id_tipo_producto: 1, 
    id_prioridad: 2,
    id_usuario: adminUserId, 
    presentacion: '100ml',
    caducidad: '2027-12-31'
  };

  const createResponse = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send(nuevoProducto);
  
  if (createResponse.statusCode !== 201) {
    const [rows] = await pool.query("SELECT id_producto FROM Producto WHERE nombre = ? LIMIT 1", [nuevoProducto.nombre]);
    if (rows.length > 0) {
      testProductId = rows[0].id_producto;
      console.log(`[Tests Movimientos] No se pudo crear, pero se ENCONTRÓ y se usará el Producto ID: ${testProductId}`);
    } else {
      console.error("Error al crear producto de prueba:", createResponse.body);
      throw new Error('No se pudo crear NI encontrar el producto de prueba en beforeAll.');
    }
  } else {
    testProductId = createResponse.body.id; 
    console.log(`[Tests Movimientos] Creado y Usando Producto ID: ${testProductId} y Admin ID: ${adminUserId}`);
  }

}, 10000); 

describe('API de Movimientos - /api/movimientos', () => {

  it('GET /motivos-baja - debe devolver la lista de motivos', async () => {
    const response = await request(app)
      .get('/api/movimientos/motivos-baja')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
  
  it('GET /usuarios - debe devolver la lista de usuarios', async () => {
    const response = await request(app)
      .get('/api/movimientos/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET / - debe devolver la bitácora principal paginada', async () => {
    const response = await request(app)
      .get('/api/movimientos')
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.movimientos)).toBe(true);
  });
  
  it('GET / - debe filtrar la bitácora por usuario y tipo de acción', async () => {
    const response = await request(app)
      .get(`/api/movimientos?usuario=${adminUserId}&tipoAccion=Entrada`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const movimientos = Array.isArray(response.body.movimientos)
      ? response.body.movimientos
      : [];

    const todosSonEntrada = movimientos.every(
      (m) => m.nombre_tipo === 'Entrada'
    );

    expect(todosSonEntrada).toBe(true);
  });

  it('POST /entradas - debe registrar una nueva entrada de stock', async () => {
    const nuevaEntrada = {
      id_producto: testProductId,
      cantidad: 50,
      descripcion_adicional: "Prueba de entrada (Jest)"
    };

    const response = await request(app)
      .post('/api/movimientos/entradas')
      .set('Authorization', `Bearer ${token}`)
      .send(nuevaEntrada);

    expect(response.statusCode).toBe(200); 
    expect(response.body.message).toBe('Entrada registrada correctamente');
    expect(response.body).toHaveProperty('id_movimiento');
  });

  it('POST /salidas - debe registrar una nueva salida (Iniciar Uso)', async () => {

    const nuevaSalida = {
      id_producto: testProductId,
      cantidad: 1, 
      id_motivo_baja: 1,
      descripcion_adicional: "Prueba de salida (Jest)"
    };

    const response = await request(app)
      .post('/api/movimientos/salidas')
      .set('Authorization', `Bearer ${token}`)
      .send(nuevaSalida);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Movimiento registrado exitosamente');
    expect(response.body.nuevo_estatus).toBe(5); 
  });

  
  it('GET /historial/:id_producto - debe devolver el historial completo del producto', async () => {
    const response = await request(app)
      .get(`/api/movimientos/historial/${testProductId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3); 
    const movimientoIniciarUso = response.body.find(
      (m) => m.motivo_baja === 'Iniciar uso'
    );
    expect(movimientoIniciarUso).toBeDefined(); 
    expect(movimientoIniciarUso.descripcion_adicional).toBe("Prueba de salida (Jest)");

    const movimientoEntrada = response.body.find(
      (m) => m.tipo_movimiento === 'Entrada' && m.descripcion_adicional === "Prueba de entrada (Jest)"
    );
    expect(movimientoEntrada).toBeDefined();
    expect(movimientoEntrada.cantidad).toBe(50);
  });

});