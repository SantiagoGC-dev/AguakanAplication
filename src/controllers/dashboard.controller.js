import pool from "../config/db.js";

/**
 * Obtener estadísticas generales para el dashboard
 * 🔥 MODIFICADO: Lógica de 'productosBajoStock' ajustada a la regla (3, 5, 8)
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        (SELECT COUNT(*) 
         FROM Producto p 
         WHERE p.id_estatus_producto NOT IN (6, 7)
        ) as totalProductos,

        (SELECT COUNT(DISTINCT p.id_producto)
         FROM Producto p
         WHERE p.existencia_actual <= p.stock_minimo
           AND p.id_estatus_producto IN (3, 5, 8) -- 3=Bajo Stock, 5=En Uso, 8=Proximos Caducar
           AND p.existencia_actual >= 0
        ) as productosBajoStock,

        (SELECT COUNT(*)
         FROM UsoProducto up
         WHERE up.fecha_fin IS NULL
        ) as productosEnUso,

        (SELECT COUNT(DISTINCT p.id_producto)
         FROM Producto p
         JOIN Reactivo r ON p.id_producto = r.id_producto
         WHERE r.caducidad BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
           AND p.id_estatus_producto NOT IN (6, 7)
        ) as proximosCaducar
    `);

    // Asegurarse de que los valores no sean null
    const result = {
      totalProductos: parseInt(stats[0].totalProductos) || 0,
      productosBajoStock: parseInt(stats[0].productosBajoStock) || 0,
      productosEnUso: parseInt(stats[0].productosEnUso) || 0,
      proximosCaducar: parseInt(stats[0].proximosCaducar) || 0,
    };

    console.log("📊 Dashboard Stats (Actualizado con regla 3,5,8):", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error obteniendo stats del dashboard:", error);
    res
      .status(500)
      .json({ error: "Error al obtener estadísticas del dashboard" });
  }
};

/**
 * Obtener productos actualmente en uso
 * (Sin cambios)
 */
export const getProductosEnUso = async (req, res) => {
  try {
    const [productos] = await pool.query(`
      SELECT 
        p.id_producto as id,
        p.nombre,
        p.lote,
        p.imagen,
        CONCAT(u.primer_nombre, ' ', u.apellido_paterno) as responsable,
        up.fecha_inicio as fechaUso
      FROM UsoProducto up
      JOIN Producto p ON up.id_producto = p.id_producto
      JOIN Usuario u ON up.id_usuario = u.id_usuario
      WHERE up.fecha_fin IS NULL
      ORDER BY up.fecha_inicio DESC
      LIMIT 5
    `);
    console.log("🔬 Productos en uso encontrados:", productos.length);
    res.json(productos);
  } catch (error) {
    console.error("❌ Error obteniendo productos en uso:", error);
    res.status(500).json({ error: "Error al obtener productos en uso" });
  }
};

/**
 * Obtener últimos movimientos para el dashboard
 * (Sin cambios)
 */
export const getMovimientosRecientes = async (req, res) => {
  try {
    const [movimientos] = await pool.query(`
      SELECT 
        m.id_movimiento as id,
        p.nombre as producto,
        CONCAT(u.primer_nombre, ' ', u.apellido_paterno) AS usuario,
        tm.nombre_tipo as tipo_movimiento,
        mb.nombre_motivo as motivo_baja,
        m.fecha,
        m.descripcion_adicional
      FROM Movimiento m
      JOIN Producto p ON m.id_producto = p.id_producto
      JOIN Usuario u ON m.id_usuario = u.id_usuario
      JOIN TipoMovimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
      LEFT JOIN MotivoBaja mb ON m.id_motivo_baja = mb.id_motivo_baja
      ORDER BY m.fecha DESC
      LIMIT 5
    `);

    console.log("📋 Movimientos recientes encontrados:", movimientos.length);
    res.json(movimientos);
  } catch (error) {
    console.error("❌ Error obteniendo movimientos recientes:", error);
    res.status(500).json({ error: "Error al obtener movimientos recientes" });
  }
};

/**
 * Obtener alertas de productos que necesitan atención
 * 🔥 MODIFICADO: Lógica de 'Bajo Stock' ajustada a la regla (3, 5, 8)
 */
export const getAlertasDashboard = async (req, res) => {
  try {
    const [alertas] = await pool.query(`
      (
        -- Productos próximos a caducar (se mantiene igual)
        SELECT 
          p.id_producto as id,
          p.nombre as producto,
          p.lote,
          'caducidad' as tipo,
          MIN(DATEDIFF(r.caducidad, CURDATE())) as diasRestantes,
          MIN(r.caducidad) as fechaCaducidad,
          NULL as stockActual,
          NULL as stockMinimo
        FROM Producto p
        JOIN Reactivo r ON p.id_producto = r.id_producto
        WHERE r.caducidad BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
          AND p.id_estatus_producto NOT IN (6, 7)
        GROUP BY p.id_producto, p.nombre, p.lote
        ORDER BY diasRestantes ASC
        LIMIT 5
      )
      
      UNION ALL
      
      (
        -- Productos con bajo stock (LÓGICA ACTUALIZADA)
        SELECT 
          p.id_producto as id,
          p.nombre as producto,
          p.lote,
          'stock' as tipo,
          NULL as diasRestantes,
          NULL as fechaCaducidad,
          p.existencia_actual as stockActual,
          p.stock_minimo as stockMinimo
        FROM Producto p
        WHERE p.existencia_actual <= p.stock_minimo
          AND p.id_estatus_producto IN (3, 5, 8) -- 3=Bajo Stock, 5=En Uso, 8=Proximos Caducar
          AND p.existencia_actual >= 0
        ORDER BY (p.existencia_actual / NULLIF(p.stock_minimo, 0)) ASC 
        LIMIT 5
      )
    `);
    console.log("⚠️ Alertas encontradas (regla 3,5,8):", alertas.length);
    res.json(alertas);
  } catch (error) {
    console.error("❌ Error obteniendo alertas:", error);
    res.status(500).json({ error: "Error al obtener alertas del dashboard" });
  }
};

/**
 * Obtener todos los datos del dashboard en una sola llamada
 * 🔥 MODIFICADO: Lógica de 'stats' y 'alertas' actualizada a la nueva regla.
 */
export const getDashboardData = async (req, res) => {
  try {
    const [stats, productos, movimientos, alertas] = await Promise.all([
      // Query de Stats (Actualizada)
      pool.query(`
        SELECT
          (SELECT COUNT(*) 
           FROM Producto p 
           WHERE p.id_estatus_producto NOT IN (6, 7)
          ) as totalProductos,

          (SELECT COUNT(DISTINCT p.id_producto)
           FROM Producto p
           WHERE p.existencia_actual <= p.stock_minimo
             AND p.id_estatus_producto IN (3, 5, 8) -- 3=Bajo Stock, 5=En Uso, 8=Proximos Caducar
             AND p.existencia_actual >= 0
          ) as productosBajoStock,

          (SELECT COUNT(*)
           FROM UsoProducto up
           WHERE up.fecha_fin IS NULL
          ) as productosEnUso,

          (SELECT COUNT(DISTINCT p.id_producto)
           FROM Producto p
           JOIN Reactivo r ON p.id_producto = r.id_producto
           WHERE r.caducidad BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
             AND p.id_estatus_producto NOT IN (6, 7)
          ) as proximosCaducar
      `),

      // Query de Productos en Uso (Sin cambios)
      pool.query(`
        SELECT 
          p.id_producto as id,
          p.nombre,
          p.lote,
          p.imagen,
          CONCAT(u.primer_nombre, ' ', u.apellido_paterno) as responsable,
          up.fecha_inicio as fechaUso
        FROM UsoProducto up
        JOIN Producto p ON up.id_producto = p.id_producto
        JOIN Usuario u ON up.id_usuario = u.id_usuario
        WHERE up.fecha_fin IS NULL
        ORDER BY up.fecha_inicio DESC
        LIMIT 5
      `),

      // Query de Movimientos (Sin cambios)
      pool.query(`
        SELECT 
          m.id_movimiento as id,
          p.nombre as producto,
          CONCAT(u.primer_nombre, ' ', u.apellido_paterno) AS usuario,
          tm.nombre_tipo as tipo_movimiento,
          mb.nombre_motivo as motivo_baja,
          m.fecha,
          m.descripcion_adicional
        FROM Movimiento m
        JOIN Producto p ON m.id_producto = p.id_producto
        JOIN Usuario u ON m.id_usuario = u.id_usuario
        JOIN TipoMovimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
        LEFT JOIN MotivoBaja mb ON m.id_motivo_baja = mb.id_motivo_baja
        ORDER BY m.fecha DESC
        LIMIT 5
      `),

      // Query de Alertas (Actualizada)
      pool.query(`
        (
          -- Productos próximos a caducar (se mantiene igual)
          SELECT 
            p.id_producto as id,
            p.nombre as producto,
            p.lote,
            'caducidad' as tipo,
            MIN(DATEDIFF(r.caducidad, CURDATE())) as diasRestantes,
            MIN(r.caducidad) as fechaCaducidad,
            NULL as stockActual,
            NULL as stockMinimo
          FROM Producto p
          JOIN Reactivo r ON p.id_producto = r.id_producto
          WHERE r.caducidad BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
            AND p.id_estatus_producto NOT IN (6, 7)
          GROUP BY p.id_producto, p.nombre, p.lote
          ORDER BY diasRestantes ASC
          LIMIT 5
        )
        
        UNION ALL
        
        (
          -- Productos con bajo stock (LÓGICA ACTUALIZADA)
          SELECT 
            p.id_producto as id,
            p.nombre as producto,
            p.lote,
            'stock' as tipo,
            NULL as diasRestantes,
            NULL as fechaCaducidad,
            p.existencia_actual as stockActual,
            p.stock_minimo as stockMinimo
          FROM Producto p
          WHERE p.existencia_actual <= p.stock_minimo
            AND p.id_estatus_producto IN (3, 5, 8) -- 3=Bajo Stock, 5=En Uso, 8=Proximos Caducar
            AND p.existencia_actual >= 0
          ORDER BY (p.existencia_actual / NULLIF(p.stock_minimo, 0)) ASC 
          LIMIT 5
        )
      `),
    ]);

    const result = {
      stats: {
        totalProductos: parseInt(stats[0][0].totalProductos) || 0,
        productosBajoStock: parseInt(stats[0][0].productosBajoStock) || 0,
        productosEnUso: parseInt(stats[0][0].productosEnUso) || 0,
        proximosCaducar: parseInt(stats[0][0].proximosCaducar) || 0,
      },
      productosEnUso: productos[0],
      movimientosRecientes: movimientos[0],
      alertas: alertas[0],
    };

    console.log("📊 Dashboard Data completo cargado (Regla 3,5,8)");
    res.json(result);
  } catch (error) {
    console.error("❌ Error obteniendo datos completos del dashboard:", error);
    res.status(500).json({ error: "Error al obtener datos del dashboard" });
  }
};