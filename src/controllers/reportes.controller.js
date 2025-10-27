import db from "../config/db.js";
import ExcelJS from 'exceljs';

//Obtiene reportes de productos agrupados por tipo con sus lotes 
export const getReportesProductos = async (req, res) => {
  try {
    const { tipoProducto, fechaDesde, fechaHasta } = req.query;

    console.log("📊 Parámetros recibidos en reportes:", {
      tipoProducto,
      fechaDesde,
      fechaHasta,
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

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Consulta optimizada
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
            WHEN m.id_tipo_movimiento = 2 THEN m.cantidad -- Salidas
            ELSE 0 
            END
        ), 0)
        FROM Movimiento m
        WHERE m.id_producto = p.id_producto 
        AND m.id_motivo_baja IN (2, 5) -- Solo Incidencias y Finalizar Uso (que restan stock)
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
    `;

    console.log("🔍 Ejecutando query de reportes...");
    const [rows] = await db.query(query, params);
    console.log(`✅ ${rows.length} productos obtenidos para reportes`);

    // Transformar datos
    const productosAgrupados = transformarDatosParaFrontend(rows);

    res.json({
      success: true,
      data: productosAgrupados,
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

// Obtiene estadísticas generales
export const getEstadisticasReportes = async (req, res) => {
  try {
    const { fechaDesde, fechaHasta } = req.query;

    console.log("📈 Obteniendo estadísticas...");

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

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN p.id_tipo_producto = 1 THEN 1 END) as reactivos,
        COUNT(CASE WHEN p.id_tipo_producto = 2 THEN 1 END) as equipos,
        COUNT(CASE WHEN p.id_tipo_producto = 3 THEN 1 END) as materiales
      FROM Producto p
      ${whereClause}
    `;

    const [rows] = await db.query(query, params);
    const stats = rows[0];

    res.json({
      success: true,
      data: {
        todos: stats.total || 0,
        reactivo: stats.reactivos || 0,
        equipo: stats.equipos || 0,
        material: stats.materiales || 0,
      },
    });
  } catch (error) {
    console.error("❌ Error en getEstadisticasReportes:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas",
    });
  }
};

const normalizarNombre = (nombre) => {
  if (!nombre) return '';
  
  return nombre
    .toLowerCase()
    .normalize("NFD") // Separar acentos de letras
    .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos (acentos)
    .trim();
};

const transformarDatosParaFrontend = (rows) => {
  const productosMap = new Map();

  rows.forEach(row => {
    // NORMALIZAR el nombre para agrupar correctamente
    const productoNombreNormalizado = normalizarNombre(row.nombre);
    const productoNombreOriginal = row.nombre; // Mantener formato original para display
    
    if (!productosMap.has(productoNombreNormalizado)) {
      // Crear producto agrupado por nombre NORMALIZADO
      productosMap.set(productoNombreNormalizado, {
        id: `group-${productoNombreNormalizado}`,
        nombre: productoNombreOriginal, // Usar el primer nombre original encontrado
        tipo: mapTipoProducto(row.tipo),
        stockActual: 0,
        lotes: []
      });
    }

    const producto = productosMap.get(productoNombreNormalizado);
    
    // Si encontramos un nombre original "mejor" (más completo), actualizarlo
    if (productoNombreOriginal.length > producto.nombre.length) {
      producto.nombre = productoNombreOriginal;
    }

    // Crear lote individual
    const lote = {
      id: `${row.id_producto}-${row.lote || '1'}`,
      lote: row.lote || 'Principal',
      stockActual: row.stockActual,
      fechaIngreso: formatFecha(row.fecha_ingreso),
      marca: row.marca,
      estatus: mapEstatus(row.estatus),
      productoId: row.id_producto,
      // Agregar cantidad consumida 
      cantidadConsumida: Math.max(0, row.cantidad_consumida || 0) 
    };

    // Agregar datos específicos por tipo
    if (row.id_tipo_producto === 1) {
      lote.fechaCaducidad = formatFecha(row.caducidad);
      lote.diasRestantes = row.dias_restantes;
      lote.presentacion = row.presentacion;
    } else if (row.id_tipo_producto === 2) {
      lote.idAgk = row.id_agk;
      lote.modelo = row.modelo;
      lote.numeroSerie = row.numero_serie;
      lote.laboratorio = row.laboratorio_nombre;
    }

    // Agregar lote al producto
    producto.lotes.push(lote);
    
    // SUMAR al stock total del producto agrupado
    producto.stockActual += row.stockActual;
  });

  return Array.from(productosMap.values());
};

const mapTipoProducto = (tipoBD) => {
  const map = { Reactivo: "reactivo", Equipo: "equipo", Material: "material" };
  return map[tipoBD] || "material";
};

const mapEstatus = (estatusBD) => {
  const map = {
    Disponible: "activo",
    "Sin stock": "inactivo",
    Baja: "inactivo",
    "En uso": "activo",
  };
  return map[estatusBD] || "activo";
};

const formatFecha = (fecha) => {
  if (!fecha) return "";
  try {
    const date = new Date(fecha);
    const meses = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];
    return `${date.getDate()}/${meses[date.getMonth()]}/${date.getFullYear()}`;
  } catch {
    return "";
  }
};

// Exportar funcion
export const exportarExcel = async (req, res) => {
  try {
    // 🔹 ACEPTAR TANTO POST COMO GET
    const { tipoProducto, fechaDesde, fechaHasta } = req.method === 'POST' ? req.body : req.query;

    console.log("📤 Exportando Excel con parámetros:", {
      tipoProducto: tipoProducto || 'todos',
      fechaDesde: fechaDesde || 'sin fecha',
      fechaHasta: fechaHasta || 'sin fecha',
      method: req.method
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

    // Consulta para obtener datos
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
    `;

    console.log("🔍 Ejecutando query para exportación...");
    const [rows] = await db.query(query, params);
    console.log(`✅ ${rows.length} registros obtenidos para exportación`);

    // Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Productos');

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

    // Agrupar productos por nombre
    const productosAgrupados = transformarDatosParaFrontend(rows);

    // Escribir encabezado del reporte
    worksheet.mergeCells('A1:H1');
    worksheet.getCell('A1').value = 'REPORTE DE INVENTARIO - SISTEMA DE GESTIÓN';
    worksheet.getCell('A1').font = { bold: true, size: 16 };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    worksheet.getCell('A2').value = `Fecha de generación: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:H3');
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
      'Marca', 'Fecha Ingreso', 'Estatus', 'Prioridad'
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    // Datos principales
    productosAgrupados.forEach(producto => {
      const fechaPrimerLote = producto.lotes[0]?.fechaIngreso || new Date();
      const row = worksheet.addRow([
        producto.nombre,
        producto.tipo,
        producto.stockActual,
        producto.lotes.length,
        producto.lotes[0]?.marca || '-',
        formatFechaExcel(new Date(fechaPrimerLote)),
        'Activo',
        '-'
      ]);

      row.eachCell((cell) => {
        cell.style = normalStyle;
      });
    });

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
      cell.style = headerStyle;
    });

    // Datos de lotes
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
        row.eachCell((cell) => {
          cell.style = normalStyle;
        });
      });
    });

    // Ajustar anchos de columnas
    worksheet.columns = [
      { width: 30 }, { width: 12 }, { width: 12 }, { width: 8 },
      { width: 15 }, { width: 12 }, { width: 10 }, { width: 10 },
      { width: 15 }, { width: 10 }, { width: 12 }, { width: 12 },
      { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 },
      { width: 15 }
    ];

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 🔹 CONFIGURACIÓN PARA DESCARGA DIRECTA
    const fecha = new Date().toISOString().split('T')[0];
    const tipo = tipoProducto || 'todos';
    const fileName = `reporte-inventario-${tipo}-${fecha}.xlsx`;

    // Configurar headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    console.log(`✅ Excel exportado: ${fileName} (${buffer.length} bytes)`);
    
    // Enviar el buffer
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error("❌ Error en exportarExcel:", error);
    res.status(500).json({
      success: false,
      error: "Error al exportar Excel: " + error.message,
    });
  }
};

// Función auxiliar para formatear fecha en Excel
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