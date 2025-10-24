import db from "../config/db.js";

export const getMotivosBaja = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id_motivo_baja, nombre_motivo FROM MotivoBaja ORDER BY nombre_motivo"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Error obteniendo motivos de baja:", error);
    res.status(500).json({ error: error.message });
  }
};

/// Obtener el historial completo de movimientos para un producto específico
export const getHistorialProducto = async (req, res) => {
  try {
    const { id_producto } = req.params;
    const [rows] = await db.query(
      `SELECT
        m.id_movimiento, m.fecha, m.cantidad, m.descripcion_adicional,
        tm.nombre_tipo as tipo_movimiento, CONCAT(u.primer_nombre, ' ', u.apellido_paterno) as responsable,
        mb.nombre_motivo as motivo_baja, 
        up.fecha_inicio, up.fecha_fin,
        -- CALCULAR DURACIÓN
        CASE 
          WHEN up.fecha_fin IS NOT NULL THEN 
            TIMEDIFF(up.fecha_fin, up.fecha_inicio)
          ELSE NULL
        END as duracion_uso
       FROM Movimiento m
       JOIN TipoMovimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
       JOIN Usuario u ON m.id_usuario = u.id_usuario
       LEFT JOIN MotivoBaja mb ON m.id_motivo_baja = mb.id_motivo_baja
       LEFT JOIN UsoProducto up ON m.id_movimiento = up.id_movimiento
       WHERE m.id_producto = ?
       ORDER BY m.fecha DESC`,
      [id_producto]
    );

    if (rows.length === 0) {
      return res.status(200).json([]);
    }
    res.json(rows);
  } catch (error) {
    console.error("❌ Error obteniendo el historial del producto:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 FUNCIÓN PARA RANGOS DE FECHAS - CORREGIDA
const getRangoFechasBackend = (periodo) => {
  const ahora = new Date();
  
  switch (periodo) {
    case "hoy":
      const inicioHoy = new Date(ahora);
      inicioHoy.setHours(0, 0, 0, 0);
      const finHoy = new Date(ahora);
      finHoy.setHours(23, 59, 59, 999);
      return { fechaInicio: inicioHoy, fechaFin: finHoy };
      
    case "7dias":
      const inicio7Dias = new Date(ahora);
      inicio7Dias.setDate(ahora.getDate() - 7);
      inicio7Dias.setHours(0, 0, 0, 0);
      const fin7Dias = new Date(ahora);
      fin7Dias.setHours(23, 59, 59, 999);
      return { fechaInicio: inicio7Dias, fechaFin: fin7Dias };
      
    case "este_mes":
      const inicioEsteMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const finEsteMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
      finEsteMes.setHours(23, 59, 59, 999);
      return { fechaInicio: inicioEsteMes, fechaFin: finEsteMes };
      
    case "mes_pasado":
      // CORRECCIÓN: Todo el mes pasado (1 de sep a 30 de sep)
      const inicioMesPasado = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const finMesPasado = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
      finMesPasado.setHours(23, 59, 59, 999);
      return { fechaInicio: inicioMesPasado, fechaFin: finMesPasado };
      
    case "este_año":
      const inicioEsteAño = new Date(ahora.getFullYear(), 0, 1);
      const finEsteAño = new Date(ahora.getFullYear(), 11, 31);
      finEsteAño.setHours(23, 59, 59, 999);
      return { fechaInicio: inicioEsteAño, fechaFin: finEsteAño };
      
    default:
      return { fechaInicio: null, fechaFin: null };
  }
};

/**
 * Obtiene todos los movimientos para la bitácora general CON PAGINACIÓN
 */
export const getMovimientos = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      periodo = 'todos',
      tipoAccion = '',
      usuario = 'todos'
    } = req.query;

    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT
        m.id_movimiento, p.nombre AS producto, p.id_producto,
        CONCAT(u.primer_nombre, ' ', u.apellido_paterno) AS usuario,
        tm.nombre_tipo, mb.nombre_motivo, m.descripcion_adicional,
        m.cantidad, m.fecha
      FROM Movimiento m
      JOIN Producto p ON m.id_producto = p.id_producto
      JOIN Usuario u ON m.id_usuario = u.id_usuario
      JOIN TipoMovimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
      LEFT JOIN MotivoBaja mb ON m.id_motivo_baja = mb.id_motivo_baja
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM Movimiento m
      JOIN Producto p ON m.id_producto = p.id_producto
      JOIN Usuario u ON m.id_usuario = u.id_usuario
      JOIN TipoMovimiento tm ON m.id_tipo_movimiento = tm.id_tipo_movimiento
      LEFT JOIN MotivoBaja mb ON m.id_motivo_baja = mb.id_motivo_baja
    `;

    const whereConditions = [];
    const params = [];

    // Búsqueda por producto
    if (search && search.trim() !== '') {
      whereConditions.push('p.nombre LIKE ?');
      params.push(`%${search.trim()}%`);
    }

    // Filtro por periodo - CORREGIDO
    if (periodo !== 'todos') {
      const { fechaInicio, fechaFin } = getRangoFechasBackend(periodo);
      
      if (fechaInicio) {
        whereConditions.push('m.fecha >= ?');
        params.push(fechaInicio);
      }
      
      if (fechaFin) {
        whereConditions.push('m.fecha < ?');
        params.push(fechaFin);
      }
    }

    // Filtro por tipo de acción
    if (tipoAccion && tipoAccion !== '') {
      if (tipoAccion === 'Entrada') {
        whereConditions.push('tm.nombre_tipo = ?');
        params.push('Entrada');
      } else {
        whereConditions.push('mb.nombre_motivo = ?');
        params.push(tipoAccion);
      }
    }

    // Filtro por usuario
    if (usuario !== 'todos') {
      whereConditions.push('u.id_usuario = ?');
      params.push(usuario);
    }

    // Construir cláusula WHERE
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    const finalQuery = `${baseQuery} ${whereClause} ORDER BY m.fecha DESC LIMIT ? OFFSET ?`;
    const finalCountQuery = `${countQuery} ${whereClause}`;

    const queryParams = [...params, parseInt(limit), offset];

    const [rows] = await db.query(finalQuery, queryParams);
    const [countRows] = await db.query(finalCountQuery, params);
    const total = countRows[0].total;

    res.json({
      movimientos: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("❌ Error obteniendo movimientos:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Registra una salida de inventario (Iniciar Uso, Finalizar Uso, Incidencia).
 */
export const registrarSalida = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      id_producto,
      id_usuario,
      cantidad,
      id_motivo_baja,
      descripcion_adicional,
    } = req.body;

    if (!id_producto || !id_usuario || !id_motivo_baja) {
      await connection.rollback();
      return res.status(400).json({
        error:
          "Faltan parámetros requeridos: id_producto, id_usuario e id_motivo_baja son obligatorios.",
      });
    }

    const motivo = parseInt(id_motivo_baja);
    const cant = parseInt(cantidad) || 1;

    // Obtener el producto y bloquear la fila para evitar condiciones de carrera
    const [productoRows] = await connection.query(
      `SELECT p.*, ep.nombre_estatus as estatus_nombre 
       FROM Producto p 
       JOIN EstatusProducto ep ON p.id_estatus_producto = ep.id_estatus_producto
       WHERE p.id_producto = ? FOR UPDATE`,
      [id_producto]
    );

    if (productoRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }
    const producto = productoRows[0];
    const estatusActual = producto.id_estatus_producto;

    // --- LÓGICA DE VALIDACIÓN ACTUALIZADA ---
    switch (motivo) {
      case 1: // INICIAR USO (CORRECTO)
        if (![1, 3, 8].includes(estatusActual)) {
          await connection.rollback();
          return res.status(400).json({
            error: `No se puede iniciar uso de un producto con estatus '${producto.estatus_nombre}'.`,
          });
        }
        if (producto.existencia_actual <= 0) {
          await connection.rollback();
          return res
            .status(400)
            .json({ error: "No hay stock disponible para iniciar uso." });
        }
        break;

      case 5: // FINALIZAR USO (CAMBIADO de 2 a 5)
        if (estatusActual !== 5) {
          await connection.rollback();
          return res.status(400).json({
            error: `Solo se puede finalizar uso de productos que estén 'En uso'.`,
          });
        }
        break;

      case 2: // INCIDENCIA (CAMBIADO de 3 a 2)
        if (!descripcion_adicional?.trim()) {
          await connection.rollback();
          return res.status(400).json({
            error: "La descripción es obligatoria al reportar una incidencia.",
          });
        }
        if (producto.existencia_actual <= 0) {
          await connection.rollback();
          return res.status(400).json({ 
            error: "No se puede reportar incidencia de un producto sin stock disponible" 
          });
        }
        break;

      case 4: // BAJA (CORRECTO)
        // Validaciones para baja
        break;
    }

    // --- Actualización de Stock ---
    let stockRestante = producto.existencia_actual;
    if ([5, 2].includes(motivo)) {
      // Finalizar Uso (5) e Incidencia (2) restan stock
      stockRestante -= cant;
      if (stockRestante < 0) {
        await connection.rollback();
        return res.status(400).json({
          error: `Stock insuficiente. Solo hay ${producto.existencia_actual} unidades.`,
        });
      }
      await connection.query(
        "UPDATE Producto SET existencia_actual = ? WHERE id_producto = ?",
        [stockRestante, id_producto]
      );
    }

    // --- Registro del Movimiento ---
    const [movimientoResult] = await connection.query(
      `INSERT INTO Movimiento (id_producto, id_usuario, id_tipo_movimiento, cantidad, fecha, id_motivo_baja, descripcion_adicional)
       VALUES (?, ?, 2, ?, NOW(), ?, ?)`,
      [id_producto, id_usuario, cant, motivo, descripcion_adicional || null]
    );
    const nuevoMovimientoId = movimientoResult.insertId;

    // --- Manejo de Ciclo de Uso ---
    if (motivo === 1) {
      // INICIAR USO
      await connection.query(
        `INSERT INTO UsoProducto (id_producto, id_usuario, id_movimiento, fecha_inicio) VALUES (?, ?, ?, NOW())`,
        [id_producto, id_usuario, nuevoMovimientoId]
      );
    } else if (motivo === 5) {
      // FINALIZAR USO (CAMBIADO de 2 a 5)
      const [usoResult] = await connection.query(
        `UPDATE UsoProducto SET fecha_fin = NOW(), id_movimiento = ? WHERE id_producto = ? AND fecha_fin IS NULL ORDER BY fecha_inicio DESC LIMIT 1`,
        [nuevoMovimientoId, id_producto]
      );
      if (usoResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(400).json({
          error:
            "Error de consistencia: No se encontró un ciclo de uso activo para finalizar.",
        });
      }
    }

    // --- Actualización de Estatus ---
    let nuevoEstatus = estatusActual;
    if (estatusActual !== 6) {
      if (motivo === 1) {
        nuevoEstatus = 5; // En uso
      } else if ([5, 2].includes(motivo)) {
        // Si se restó stock (Finalizar uso 5, Incidencia 2)
        if (stockRestante <= 0) nuevoEstatus = 2; // Sin stock
        else if (stockRestante <= producto.stock_minimo)
          nuevoEstatus = 3; // Bajo stock
        else if (motivo === 5) nuevoEstatus = 1; // Disponible (solo tras finalizar uso)
      }

      if (nuevoEstatus !== estatusActual) {
        await connection.query(
          "UPDATE Producto SET id_estatus_producto = ? WHERE id_producto = ?",
          [nuevoEstatus, id_producto]
        );
      }
    }

    await connection.commit();
    res.json({
      message: "Movimiento registrado exitosamente",
      id_movimiento: nuevoMovimientoId,
      nuevo_estatus: nuevoEstatus,
      stock_restante: stockRestante,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error registrando salida:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Registra una entrada de inventario.
 */
export const registrarEntrada = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id_producto, id_usuario, cantidad, descripcion_adicional } =
      req.body;

    if (!id_producto || !id_usuario || !cantidad) {
      return res
        .status(400)
        .json({ error: "id_producto, id_usuario y cantidad son requeridos" });
    }
    if (cantidad <= 0) {
      return res.status(400).json({ error: "La cantidad debe ser mayor a 0" });
    }

    await connection.query(
      "UPDATE Producto SET existencia_actual = existencia_actual + ? WHERE id_producto = ?",
      [cantidad, id_producto]
    );

    const [result] = await connection.query(
      `INSERT INTO Movimiento (id_producto, id_usuario, id_tipo_movimiento, cantidad, fecha, descripcion_adicional)
             VALUES (?, ?, 1, ?, NOW(), ?)`,
      [id_producto, id_usuario, cantidad, descripcion_adicional || null]
    );

    await connection.commit();
    res.json({
      message: "Entrada registrada correctamente",
      id_movimiento: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error registrando entrada:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Registra la baja completa de un lote de producto.
 */
export const registrarBaja = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { id_producto, id_usuario, descripcion_adicional } = req.body;
    const id_motivo_baja = 4; // El motivo 'Baja' es fijo para este endpoint

    if (!id_producto || !id_usuario || !descripcion_adicional?.trim()) {
      await connection.rollback();
      return res.status(400).json({
        error:
          "El ID del producto, del usuario y una descripción son obligatorios.",
      });
    }

    const [productoRows] = await connection.query(
      "SELECT existencia_actual, id_estatus_producto FROM Producto WHERE id_producto = ? FOR UPDATE",
      [id_producto]
    );
    
    if (productoRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Producto no encontrado." });
    }
    
    const producto = productoRows[0];
    const existenciaActual = producto.existencia_actual;

    // ✅ NUEVA VALIDACIÓN: No permitir baja si no hay stock
    if (existenciaActual <= 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: "No se puede dar de baja un producto sin stock disponible" 
      });
    }

    // ✅ VALIDACIÓN ADICIONAL: No permitir si ya está de baja
    if (producto.id_estatus_producto === 6) {
      await connection.rollback();
      return res.status(400).json({ 
        error: "El producto ya está dado de baja" 
      });
    }

    // --- LÓGICA ACTUALIZADA: Pone el stock a 0 y el estatus a 'Baja' (6) ---
    await connection.query(
      "UPDATE Producto SET existencia_actual = 0, id_estatus_producto = 6 WHERE id_producto = ?",
      [id_producto]
    );

    // Registra el movimiento con la cantidad que había antes de la baja
    const [result] = await connection.query(
      `INSERT INTO Movimiento (id_producto, id_usuario, id_tipo_movimiento, cantidad, fecha, id_motivo_baja, descripcion_adicional)
       VALUES (?, ?, 2, ?, NOW(), ?, ?)`,
      [
        id_producto,
        id_usuario,
        existenciaActual,
        id_motivo_baja,
        descripcion_adicional,
      ]
    );

    await connection.commit();
    res.json({
      message: "Baja de lote registrada correctamente",
      id_movimiento: result.insertId,
      nuevo_estatus: 6,
      stock_restante: 0,
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error registrando baja:", error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        u.id_usuario,
        CONCAT(u.primer_nombre, ' ', u.apellido_paterno, ' ', u.apellido_materno) as nombre_completo,
        u.primer_nombre,
        u.apellido_paterno, 
        u.apellido_materno,
        r.nombre_rol as rol
       FROM Usuario u
       JOIN Rol r ON u.id_rol = r.id_rol
       WHERE u.id_estatus_usuario = 1 -- Solo usuarios activos
       ORDER BY u.primer_nombre, u.apellido_paterno`
    );
    console.log("✅ Usuarios obtenidos:", rows.length);
    res.json(rows);
  } catch (error) {
    console.error("❌ Error obteniendo usuarios:", error);
    res.status(500).json({ error: error.message });
  }
};