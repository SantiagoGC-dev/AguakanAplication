import request from 'supertest';
import app from '../src/app.js'; 
import pool from '../src/config/db.js'; 

// --- Variables Globales para este Test ---
let token; 
let testProductId; // ID del producto que crearemos AQUÍ MISMO
let adminUserId; 

// -----------------------------------------------------------------
// 1. ANTES DE TODAS LAS PRUEBAS
// -----------------------------------------------------------------
beforeAll(async () => {
  // 1a. Iniciar sesión como Admin
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

  // 1b. --- ¡NUEVO! ---
  // CREAMOS un producto FRESCO solo para esta suite de pruebas
  const nuevoProducto = {
    nombre: 'Reactivo para Prueba de Movimientos',
    marca: 'Marca Movimientos',
    lote: 'LOTE-MOV-123',
    existencia_actual: 10, // Empezamos con 10
    stock_minimo: 5,
    imagen: 'default.png',
    id_tipo_producto: 1, // 1 = Reactivo
    id_prioridad: 2,
    id_usuario: adminUserId, // Usamos el ID del admin
    presentacion: '100ml',
    caducidad: '2027-12-31'
  };

  const createResponse = await request(app)
    .post('/api/productos')
    .set('Authorization', `Bearer ${token}`)
    .send(nuevoProducto);
  
  if (createResponse.statusCode !== 201) {
    // Si falla aquí, probablemente es porque el producto "zombie" de la prueba anterior sigue ahí.
    // Vamos a buscarlo.
    const [rows] = await pool.query("SELECT id_producto FROM Producto WHERE nombre = ? LIMIT 1", [nuevoProducto.nombre]);
    if (rows.length > 0) {
      testProductId = rows[0].id_producto;
      console.log(`[Tests Movimientos] No se pudo crear, pero se ENCONTRÓ y se usará el Producto ID: ${testProductId}`);
    } else {
      console.error("Error al crear producto de prueba:", createResponse.body);
      throw new Error('No se pudo crear NI encontrar el producto de prueba en beforeAll.');
    }
  } else {
    testProductId = createResponse.body.id; // ¡Guardamos el ID FRESCO!
    console.log(`[Tests Movimientos] Creado y Usando Producto ID: ${testProductId} y Admin ID: ${adminUserId}`);
  }

}, 10000); // Damos 10s al setup por si acaso

// -----------------------------------------------------------------
// 2. DESPUÉS DE TODAS LAS PRUEBAS
// -----------------------------------------------------------------
// ¡¡¡ELIMINAMOS EL afterAll DE AQUÍ!!!
// (Se moverá a reportes.test.js)
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// 3. INICIO DE LAS PRUEBAS DE MOVIMIENTOS
// -----------------------------------------------------------------
describe('API de Movimientos - /api/movimientos', () => {

  // --- PRUEBAS DE "LECTURA" (BitacoraScreen) ---

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

    // --- ✅ ¡LA CORRECCIÓN ESTÁ AQUÍ! ---
    // Tu API devuelve 'nombre_tipo', no 'tipo_movimiento' en esta ruta
    const todosSonEntrada = movimientos.every(
      (m) => m.nombre_tipo === 'Entrada'
    );

    expect(todosSonEntrada).toBe(true);
  });

  // --- PRUEBAS DE "ESCRITURA" (Registrar Movimientos) ---

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
    // Como creamos un producto FRESCO en beforeAll, 
    // sabemos que está "Disponible" (estatus 1)
    const nuevaSalida = {
      id_producto: testProductId,
      cantidad: 1, 
      id_motivo_baja: 1, // 1 = Iniciar Uso
      descripcion_adicional: "Prueba de salida (Jest)"
    };

    const response = await request(app)
      .post('/api/movimientos/salidas')
      .set('Authorization', `Bearer ${token}`)
      .send(nuevaSalida);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Movimiento registrado exitosamente');
    expect(response.body.nuevo_estatus).toBe(5); // 5 = En uso
  });

  // --- PRUEBA DE VERIFICACIÓN (Leer historial) ---
  
  it('GET /historial/:id_producto - debe devolver el historial completo del producto', async () => {
    const response = await request(app)
      .get(`/api/movimientos/historial/${testProductId}`)
      .set('Authorization', `Bearer ${token}`);
      
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // 1. Creación en beforeAll (1 mov.)
    // 2. "POST /entradas" (2do mov.)
    // 3. "POST /salidas" (3er mov.)
    expect(response.body.length).toBeGreaterThanOrEqual(3); 
    
    // Busca los movimientos que acabamos de crear
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