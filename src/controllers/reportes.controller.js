import db from "../config/db.js";
import ExcelJS from 'exceljs';

// 🔹 CACHÉS para optimización
const estadisticasCache = new Map();
const normalizationCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// 🔹 Obtiene reportes de productos con paginación
export const getReportesProductos = async (req, res) => {
  try {
    const { tipoProducto, fechaDesde, fechaHasta, page = 1, limit = 50 } = req.query;

    console.log("📊 Parámetros recibidos en reportes:", {
      tipoProducto,
      fechaDesde,
      fechaHasta,
      page,
      limit
    });

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = [];
    let params = [];

    // Filtro por tipo de producto
    if (tipoProducto && tipoProducto !== "todos") {
      const tipoMap = {
        reactivo: 1,
        equipo: 2,
        material: 3,
      };

      if (tipoMap[tipoProducto]) {
        whereConditions.push("p.id_tipo_producto = ?");
        params.push(tipoMap[tipoProducto]);
      }
    }

    // Filtro por fecha de ingreso
    if (fechaDesde) {
      whereConditions.push("p.fecha_ingreso >= ?");
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      whereConditions.push("p.fecha_ingreso <= ?");
      params.push(fechaHasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // 🔹 CONSULTA PRINCIPAL CON PAGINACIÓN
    const query = `
      SELECT 
        p.id_producto,
        p.nombre,
        p.marca,
        p.lote,
        p.existencia_actual as stockActual,
        p.fecha_ingreso,
        p.id_tipo_producto,
        tp.nombre_tipo as tipo,
        ep.nombre_estatus as estatus,
        pr.nombre_prioridad as prioridad,
        
        -- Datos específicos de reactivos
        r.presentacion,
        r.caducidad,
        DATEDIFF(r.caducidad, CURDATE()) as dias_restantes,
        
        -- Datos específicos de equipos
        eq.id_agk,
        eq.modelo,
        eq.numero_serie,
        eq.rango_medicion,
        eq.resolucion,
        eq.intervalo_trabajo,
        l.nombre as laboratorio_nombre,
        
        -- 🔹 CÁLCULO MEJORADO de cantidad consumida
        (
          SELECT COALESCE(SUM(
            CASE 
              WHEN m.id_tipo_movimiento = 2 THEN m.cantidad
              ELSE 0 
            END
          ), 0)
          FROM Movimiento m
          WHERE m.id_producto = p.id_producto 
          AND m.id_motivo_baja IN (2, 5)
        ) as cantidad_consumida
        
      FROM Producto p
      JOIN TipoProducto tp ON p.id_tipo_producto = tp.id_tipo_producto
      JOIN EstatusProducto ep ON p.id_estatus_producto = ep.id_estatus_producto
      LEFT JOIN Prioridad pr ON p.id_prioridad = pr.id_prioridad
      LEFT JOIN Reactivo r ON p.id_producto = r.id_producto
      LEFT JOIN Equipo eq ON p.id_producto = eq.id_producto
      LEFT JOIN Laboratorio l ON eq.id_laboratorio = l.id_laboratorio
      ${whereClause}
      ORDER BY p.nombre, p.fecha_ingreso DESC
      LIMIT ? OFFSET ?
    `;

    // 🔹 CONSULTA PARA TOTAL (sin paginación)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Producto p
      ${whereClause}
    `;

    console.log("🔍 Ejecutando queries de reportes...");
    
    // Ejecutar ambas consultas en paralelo
    const [rows, countRows] = await Promise.all([
      db.query(query, [...params, limitNum, offset]),
      db.query(countQuery, params)
    ]);

    const productos = rows[0];
    const total = countRows[0][0].total;
    const totalPages = Math.ceil(total / limitNum);

    console.log(`✅ ${productos.length} productos obtenidos (página ${pageNum} de ${totalPages})`);

    // Transformar datos
    const productosAgrupados = transformarDatosParaFrontend(productos);

    res.json({
      success: true,
      data: productosAgrupados,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages
      },
      total: productosAgrupados.length,
      fechaGeneracion: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Error en getReportesProductos:", error);
    res.status(500).json({
      success: false,
      error: "Error al generar reportes: " + error.message,
    });
  }
};

// 🔹 Obtiene estadísticas generales con caché
export const getEstadisticasReportes = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;

    // Crear clave de caché única
    const cacheKey = `stats-${fechaDesde}-${fechaHasta}`;
    
    // Verificar caché
    const cached = estadisticasCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log("📈 Estadísticas servidas desde caché");
      return res.json(cached.data);
    }

    console.log("📈 Obteniendo estadísticas desde BD...");

    let whereConditions = [];
    let params = [];

    if (fechaDesde) {
      whereConditions.push("p.fecha_ingreso >= ?");
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      whereConditions.push("p.fecha_ingreso <= ?");
      params.push(fechaHasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // 🔹 CONSULTA OPTIMIZADA - una sola consulta
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN p.id_tipo_producto = 1 THEN 1 ELSE 0 END) as reactivos,
        SUM(CASE WHEN p.id_tipo_producto = 2 THEN 1 ELSE 0 END) as equipos,
        SUM(CASE WHEN p.id_tipo_producto = 3 THEN 1 ELSE 0 END) as materiales
      FROM Producto p
      ${whereClause}
    `;

    const [rows] = await db.query(query, params);
    const stats = rows[0];

    const response = {
      success: true,
      data: {
        todos: parseInt(stats.total) || 0,
        reactivo: parseInt(stats.reactivos) || 0,
        equipo: parseInt(stats.equipos) || 0,
        material: parseInt(stats.materiales) || 0,
      },
    };

    // Guardar en caché
    estadisticasCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    });

    // Limpiar caché antiguo periódicamente
    cleanupOldCache();

    res.json(response);
  } catch (error) {
    console.error("❌ Error en getEstadisticasReportes:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas",
    });
  }
};

// 🔹 Función para limpiar caché antiguo
const cleanupOldCache = () => {
  const now = Date.now();
  for (const [key, value] of estadisticasCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      estadisticasCache.delete(key);
    }
  }
};

// 🔹 VERSIÓN OPTIMIZADA de normalización con cache
const normalizarNombre = (nombre) => {
  if (!nombre) return '';
  
  // Verificar caché primero
  if (normalizationCache.has(nombre)) {
    return normalizationCache.get(nombre);
  }
  
  const normalized = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  
  // Guardar en caché (limitar tamaño para evitar memory leaks)
  if (normalizationCache.size > 10000) {
    const firstKey = normalizationCache.keys().next().value;
    normalizationCache.delete(firstKey);
  }
  
  normalizationCache.set(nombre, normalized);
  return normalized;
};

// 🔹 VERSIÓN OPTIMIZADA de transformación de datos
const transformarDatosParaFrontend = (rows) => {
  const productosMap = new Map();

  // Pre-compilar funciones de mapeo
  const getTipoProducto = createTipoMapper();
  const getEstatus = createEstatusMapper();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // NORMALIZAR el nombre para agrupar correctamente
    const productoNombreNormalizado = normalizarNombre(row.nombre);
    
    if (!productosMap.has(productoNombreNormalizado)) {
      // Crear producto agrupado
      productosMap.set(productoNombreNormalizado, {
        id: `group-${productoNombreNormalizado}-${i}`, // Agregar índice para único ID
        nombre: row.nombre,
        tipo: getTipoProducto(row.tipo),
        stockActual: 0,
        lotes: []
      });
    }

    const producto = productosMap.get(productoNombreNormalizado);
    
    // Si encontramos un nombre original "mejor" (más completo), actualizarlo
    if (row.nombre.length > producto.nombre.length) {
      producto.nombre = row.nombre;
    }

    // Crear lote individual
    const lote = {
      id: `${row.id_producto}-${row.lote || '1'}`,
      lote: row.lote || 'Principal',
      stockActual: row.stockActual,
      fechaIngreso: formatFecha(row.fecha_ingreso),
      marca: row.marca,
      estatus: getEstatus(row.estatus),
      productoId: row.id_producto,
      cantidadConsumida: Math.max(0, row.cantidad_consumida || 0)
    };

    // Agregar datos específicos por tipo (solo si existen)
    if (row.id_tipo_producto === 1 && row.caducidad) {
      lote.fechaCaducidad = formatFecha(row.caducidad);
      lote.diasRestantes = row.dias_restantes;
      lote.presentacion = row.presentacion;
    } else if (row.id_tipo_producto === 2) {
      lote.idAgk = row.id_agk || null;
      lote.modelo = row.modelo || null;
      lote.numeroSerie = row.numero_serie || null;
      lote.laboratorio = row.laboratorio_nombre || null;
    }

    // Agregar lote al producto
    producto.lotes.push(lote);
    
    // SUMAR al stock total del producto agrupado
    producto.stockActual += row.stockActual;
  }

  return Array.from(productosMap.values());
};

// 🔹 FUNCIONES OPTIMIZADAS de mapeo
const createTipoMapper = () => {
  const map = { 
    Reactivo: "reactivo", 
    Equipo: "equipo", 
    Material: "material" 
  };
  return (tipoBD) => map[tipoBD] || "material";
};

const createEstatusMapper = () => {
  const map = {
    Disponible: "activo",
    "Sin stock": "inactivo",
    Baja: "inactivo",
    "En uso": "activo",
  };
  return (estatusBD) => map[estatusBD] || "activo";
};

// 🔹 Función para formatear fecha
const formatFecha = (fecha) => {
  if (!fecha) return "";
  try {
    const date = new Date(fecha);
    const meses = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];
    return `${date.getDate()}/${meses[date.getMonth()]}/${date.getFullYear()}`;
  } catch {
    return "";
  }
};

// 🔹 Exportar a Excel optimizado para grandes volúmenes
export const exportarExcel = async (req, res) => {
  try {
    // 🔹 ACEPTAR TANTO POST COMO GET
    const { tipoProducto, fechaDesde, fechaHasta, batchSize = 1000 } = req.method === 'POST' ? req.body : req.query;

    console.log("📤 Exportando Excel optimizado con parámetros:", {
      tipoProducto: tipoProducto || 'todos',
      fechaDesde: fechaDesde || 'sin fecha',
      fechaHasta: fechaHasta || 'sin fecha',
      method: req.method,
      batchSize
    });

    let whereConditions = [];
    let params = [];

    // Filtro por tipo de producto
    if (tipoProducto && tipoProducto !== "todos") {
      const tipoMap = {
        reactivo: 1,
        equipo: 2,
        material: 3,
      };

      if (tipoMap[tipoProducto]) {
        whereConditions.push("p.id_tipo_producto = ?");
        params.push(tipoMap[tipoProducto]);
      }
    }

    // Filtro por fecha de ingreso
    if (fechaDesde) {
      whereConditions.push("p.fecha_ingreso >= ?");
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      whereConditions.push("p.fecha_ingreso <= ?");
      params.push(fechaHasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // 🔹 CONSULTA PARA CONTAR TOTAL (más rápido)
    const countQuery = `SELECT COUNT(*) as total FROM Producto p ${whereClause}`;
    const [countRows] = await db.query(countQuery, params);
    const total = countRows[0].total;

    console.log(`📊 Exportando ${total} registros en lotes de ${batchSize}...`);

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Productos');

    // Configurar headers de respuesta ANTES de procesar datos
    const fecha = new Date().toISOString().split('T')[0];
    const tipo = tipoProducto || 'todos';
    const fileName = `reporte-inventario-${tipo}-${fecha}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');

    // Configurar encabezados del Excel
    setupExcelHeaders(worksheet, tipoProducto, fechaDesde, fechaHasta);

    // 🔹 PROCESAR EN LOTES para evitar memory overflow
    const batches = Math.ceil(total / batchSize);
    let processedCount = 0;

    for (let batch = 0; batch < batches; batch++) {
      const offset = batch * batchSize;
      
      const query = `
        SELECT 
          p.id_producto,
          p.nombre,
          p.marca,
          p.lote,
          p.existencia_actual as stockActual,
          p.fecha_ingreso,
          p.id_tipo_producto,
          tp.nombre_tipo as tipo,
          ep.nombre_estatus as estatus,
          pr.nombre_prioridad as prioridad,
          
          -- Datos específicos de reactivos
          r.presentacion,
          r.caducidad,
          DATEDIFF(r.caducidad, CURDATE()) as dias_restantes,
          
          -- Datos específicos de equipos
          eq.id_agk,
          eq.modelo,
          eq.numero_serie,
          eq.rango_medicion,
          eq.resolucion,
          eq.intervalo_trabajo,
          l.nombre as laboratorio_nombre,
          
          -- Cantidad consumida
          (
            SELECT COALESCE(SUM(
              CASE 
                WHEN m.id_tipo_movimiento = 2 THEN m.cantidad
                ELSE 0 
              END
            ), 0)
            FROM Movimiento m
            WHERE m.id_producto = p.id_producto 
            AND m.id_motivo_baja IN (2, 5)
          ) as cantidad_consumida
          
        FROM Producto p
        JOIN TipoProducto tp ON p.id_tipo_producto = tp.id_tipo_producto
        JOIN EstatusProducto ep ON p.id_estatus_producto = ep.id_estatus_producto
        LEFT JOIN Prioridad pr ON p.id_prioridad = pr.id_prioridad
        LEFT JOIN Reactivo r ON p.id_producto = r.id_producto
        LEFT JOIN Equipo eq ON p.id_producto = eq.id_producto
        LEFT JOIN Laboratorio l ON eq.id_laboratorio = l.id_laboratorio
        ${whereClause}
        ORDER BY p.nombre, p.fecha_ingreso DESC
        LIMIT ? OFFSET ?
      `;

      const [rows] = await db.query(query, [...params, batchSize, offset]);
      
      // Procesar y agregar datos del lote actual
      processedCount += await addBatchToExcel(worksheet, rows, batch, processedCount);
      
      console.log(`✅ Procesado lote ${batch + 1}/${batches} (${rows.length} registros, total: ${processedCount})`);
    }

    // Ajustar columnas
    worksheet.columns = getColumnWidths();

    // Stream directamente a la respuesta
    await workbook.xlsx.write(res);
    
    console.log(`✅ Excel exportado completamente: ${fileName} (${processedCount} registros)`);

  } catch (error) {
    console.error("❌ Error en exportarExcel:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Error al exportar Excel: " + error.message,
      });
    }
  }
};

// 🔹 FUNCIONES AUXILIARES para Excel
const setupExcelHeaders = (worksheet, tipoProducto, fechaDesde, fechaHasta) => {
  // Estilos
  const headerStyle = {
    font: { bold: true, color: { argb: 'FFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4B9CD3' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  const normalStyle = {
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  };

  // Escribir encabezado del reporte
  worksheet.mergeCells('A1:G1');
  worksheet.getCell('A1').value = 'REPORTE DE INVENTARIO - SISTEMA DE GESTIÓN';
  worksheet.getCell('A1').font = { bold: true, size: 16 };
  worksheet.getCell('A1').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  worksheet.getCell('A2').alignment = { horizontal: 'center' };

  worksheet.mergeCells('A3:G3');
  let filtrosTexto = `Filtros aplicados: Tipo: ${tipoProducto === 'todos' ? 'Todos' : tipoProducto}`;
  if (fechaDesde) filtrosTexto += `, Desde: ${fechaDesde}`;
  if (fechaHasta) filtrosTexto += `, Hasta: ${fechaHasta}`;
  worksheet.getCell('A3').value = filtrosTexto;
  worksheet.getCell('A3').alignment = { horizontal: 'center' };

  // Espacio
  worksheet.addRow([]);

  // Encabezados de la tabla principal
  const headers = [
    'Producto', 'Tipo', 'Stock Total', 'Lotes', 
    'Fecha Ingreso', 'Estatus', 'Prioridad'
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.style = headerStyle;
  });
};

const addBatchToExcel = async (worksheet, rows, batch, currentRow) => {
  const productosAgrupados = transformarDatosParaFrontend(rows);
  let rowCount = 0;

  // Datos principales
  productosAgrupados.forEach(producto => {
    // Obtener el estatus y prioridad del primer lote
    const primerLote = producto.lotes[0];
    
    // Buscar en los datos originales para obtener estatus y prioridad reales
    const productoOriginal = rows.find(row => 
      normalizarNombre(row.nombre) === normalizarNombre(producto.nombre)
    );

    const row = worksheet.addRow([
      producto.nombre,
      producto.tipo,
      producto.stockActual,
      producto.lotes.length,
      formatFechaExcel(primerLote?.fechaIngreso),
      productoOriginal?.estatus || 'Desconocido',
      productoOriginal?.prioridad || '-'
    ]);

    rowCount++;
  });

  // Si es el primer lote, agregar detalles
  if (batch === 0) {
    // Espacio entre secciones
    worksheet.addRow([]);
    worksheet.addRow([]);

    // DETALLES POR LOTE
    const detalleHeader = worksheet.addRow(['DETALLES POR LOTE']);
    detalleHeader.getCell(1).font = { bold: true, size: 14 };
    worksheet.addRow([]);

    // Encabezados de detalles
    const detalleHeaders = [
      'Producto', 'Lote', 'Stock', 'Consumido', 
      'Marca', 'F. Ingreso', 'F. Caducidad', 'Días Restantes',
      'ID AGK', 'Modelo', 'No. Serie', 'Laboratorio'
    ];

    const detalleHeaderRow = worksheet.addRow(detalleHeaders);
    detalleHeaderRow.eachCell((cell) => {
      cell.style = {
        font: { bold: true, color: { argb: 'FFFFFF' } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4B9CD3' } },
        alignment: { horizontal: 'center', vertical: 'middle' },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };
    });
  }

  // Agregar detalles de lotes para este batch
  productosAgrupados.forEach(producto => {
    producto.lotes.forEach(lote => {
      const rowData = [
        producto.nombre,
        lote.lote,
        lote.stockActual,
        lote.cantidadConsumida || 0,
        lote.marca || '-',
        lote.fechaIngreso,
        lote.fechaCaducidad || '-',
        lote.diasRestantes || '-',
        lote.idAgk || '-',
        lote.modelo || '-',
        lote.numeroSerie || '-',
        lote.laboratorio || '-'
      ];

      const row = worksheet.addRow(rowData);
      rowCount++;
    });
  });

  return rowCount;
};

const getColumnWidths = () => [
  { width: 30 }, // Producto
  { width: 12 }, // Tipo
  { width: 12 }, // Stock Total
  { width: 8 },  // Lotes
  { width: 12 }, // Fecha Ingreso
  { width: 12 }, // Estatus
  { width: 12 }, // Prioridad
  // Columnas para detalles
  { width: 15 }, { width: 10 }, { width: 12 }, { width: 12 },
  { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 }
];

// 🔹 Función auxiliar para formatear fecha en Excel
const formatFechaExcel = (fecha) => {
  if (!fecha) return '';
  try {
    // Si es string, convertirlo a Date
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};