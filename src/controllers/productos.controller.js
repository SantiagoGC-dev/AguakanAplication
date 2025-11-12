import pool from "../config/db.js";

export const updateProductosEstatus = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // LÓGICA DE ESTATUS AUTOMÁTICOS ACTUALIZADA
    await connection.query(`
      UPDATE Producto p
      LEFT JOIN Reactivo r ON p.id_producto = r.id_producto
      SET p.id_estatus_producto = 
          CASE 
              -- PRIORIDAD 1: ESTATUS MANUALES (En Uso, Baja) no se modifican.
              WHEN p.id_estatus_producto IN (5, 6) THEN p.id_estatus_producto
              
              -- PRIORIDAD 2: REACTIVOS CADUCADOS (Máxima prioridad)
              WHEN p.id_tipo_producto = 1 AND r.caducidad < CURDATE() THEN 7 -- Caducado
              
              -- PRIORIDAD 3: REACTIVOS PRÓXIMOS A CADUCAR
              WHEN p.id_tipo_producto = 1 AND r.caducidad <= DATE_ADD(CURDATE(), INTERVAL 15 DAY) THEN 8 -- Próximo a caducar
              
              -- PRIORIDAD 4: SIN STOCK
              WHEN p.existencia_actual <= 0 THEN 2 -- Sin stock
              
              -- PRIORIDAD 5: BAJO STOCK
              WHEN p.id_tipo_producto != 2 AND p.existencia_actual <= p.stock_minimo THEN 3 -- Bajo stock
              
              -- PRIORIDAD 6: DISPONIBLE
              ELSE 1 -- Disponible
          END
      WHERE 
          p.id_estatus_producto NOT IN (5, 6)
    `);

    await connection.commit();
    console.log("✅ Estatus de productos actualizados automáticamente");
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error actualizando estatus automáticos:", error);
    throw error;
  } finally {
    connection.release();
  }
};

export const getLaboratorios = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_laboratorio, nombre, ubicacion FROM laboratorio"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en getLaboratorios:", error);
    res.status(500).json({ error: "Error al obtener laboratorios" });
  }
};

export const getTipoProducto = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM tipoproducto");
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en getTipoProducto:", error);
    res.status(500).json({ error: "Error al obtener tipo de producto" });
  }
};

// Obtener todos los estatus de productos
export const getEstatusProductos = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM estatusproducto");
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en getEstatusProductos:", error);
    res.status(500).json({ error: "Error al obtener estatus de productos" });
  }
};

export const getPrioridades = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_prioridad, nombre_prioridad FROM Prioridad ORDER BY nombre_prioridad"
    );
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en getPrioridades:", error);
    res.status(500).json({ error: "Error al obtener prioridades" });
  }
};

// Obtener todos los productos
export const getProductos = async (req, res) => {
  try {
    await updateProductosEstatus();
    // 1. CAPTURAR PARÁMETROS (sin cambios)
    const {
      page = 1,
      limit = 20,
      orden = "antiguos",
      busqueda = "",
      tipo = "todos",
      prioridad = "todos",
      estatus = "todos",
      periodo = "todos",
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // 2. CONSTRUIR 'WHERE' (sin cambios)
    let whereClauses = [];
    let params = [];

    if (busqueda) {
      whereClauses.push("p.nombre LIKE ?");
      params.push(`%${busqueda}%`);
    }
    if (tipo !== "todos") {
      whereClauses.push("tp.nombre_tipo = ?");
      params.push(tipo);
    }
    if (prioridad !== "todos") {
      whereClauses.push("p.id_prioridad = ?");
      params.push(prioridad);
    }
    if (estatus !== "todos") {
      whereClauses.push("p.id_estatus_producto = ?");
      params.push(estatus);
    }

    // 3. LÓGICA DE PERIODO (sin cambios)
    switch (periodo) {
      case "semanal":
        whereClauses.push("p.fecha_ingreso >= CURDATE() - INTERVAL 7 DAY");
        break;
      case "mensual":
        whereClauses.push("p.fecha_ingreso >= CURDATE() - INTERVAL 1 MONTH");
        break;
      case "trimestral":
        whereClauses.push("p.fecha_ingreso >= CURDATE() - INTERVAL 3 MONTH");
        break;
      case "anual":
        whereClauses.push("p.fecha_ingreso >= CURDATE() - INTERVAL 1 YEAR");
        break;
    }

    const whereString =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    // 4. LÓGICA DE ORDENAMIENTO (sin cambios)
    const orderBy =
      orden === "recientes"
        ? "ORDER BY p.fecha_ingreso DESC, p.id_producto DESC"
        : "ORDER BY p.fecha_ingreso ASC, p.id_producto ASC";

    // 5. PRIMERA CONSULTA: CONTEO TOTAL
    // Esta consulta SÍ necesita los joins para que los filtros (ej: por tipo) funcionen
    const countQuery = `
      SELECT COUNT(DISTINCT p.id_producto) as totalCount
      FROM Producto p
      -- Se necesita tipoproducto por si se filtra por 'tipo'
      JOIN tipoproducto tp ON p.id_tipo_producto = tp.id_tipo_producto
      ${whereString}
    `;
    const [countRows] = await pool.query(countQuery, params);
    const totalCount = countRows[0].totalCount || 0;

    //
    const dataQuery = `
      SELECT 
          p.*,
          -- Envolver columnas de tablas unidas en MAX() para compatibilidad con GROUP BY
          MAX(pr.nombre_prioridad) AS prioridad,
          MAX(tp.nombre_tipo) AS tipo,
          MAX(e.nombre_estatus) AS estatus,
          MAX(eq.id_equipo) AS id_equipo, 
          MAX(eq.id_agk) AS id_agk, 
          MAX(eq.modelo) AS modelo, 
          MAX(eq.numero_serie) AS numero_serie, 
          MAX(eq.rango_medicion) AS rango_medicion, 
  MAX(eq.resolucion) AS resolucion, 
          MAX(eq.intervalo_trabajo) AS intervalo_trabajo, 
          MAX(eq.id_laboratorio) AS equipo_laboratorio_id,
          MAX(le.nombre) AS equipo_laboratorio_nombre,
          MAX(r.presentacion) AS presentacion, 
          MAX(r.caducidad) AS caducidad
      FROM Producto p
      JOIN estatusproducto e ON p.id_estatus_producto = e.id_estatus_producto
      JOIN tipoproducto tp ON p.id_tipo_producto = tp.id_tipo_producto
      LEFT JOIN Prioridad pr ON p.id_prioridad = pr.id_prioridad
      LEFT JOIN Equipo eq ON p.id_producto = eq.id_producto
LEFT JOIN laboratorio le ON eq.id_laboratorio = le.id_laboratorio
      LEFT JOIN Reactivo r ON p.id_producto = r.id_producto
      ${whereString}
      -- ✅ FORZAR QUE SOLO DEVUELVA UN REGISTRO POR PRODUCTO
      GROUP BY p.id_producto 
      ${orderBy}
      LIMIT ? OFFSET ?
    `;

    // Añadir límite y offset a los parámetros
    const finalParams = [...params, Number(limit), Number(offset)];

    const [rows] = await pool.query(dataQuery, finalParams);

    //
    res.json({ products: rows, totalCount: totalCount });
  } catch (error) {
    console.error("❌ Error en getProductos:", error);
    res.status(500).json({ error: "Error al obtener productos" });
  }
};

// Obtener un producto por ID
export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT 
          p.*,
          pr.nombre_prioridad AS prioridad,
          tp.nombre_tipo AS tipo,
          e.nombre_estatus AS estatus,
          eq.id_equipo, eq.id_agk, eq.modelo, eq.numero_serie, eq.rango_medicion, 
          eq.resolucion, eq.intervalo_trabajo, eq.id_laboratorio AS equipo_laboratorio_id,
          le.nombre AS equipo_laboratorio_nombre,
          le.ubicacion AS equipo_laboratorio_ubicacion,
          r.presentacion, r.caducidad
      FROM Producto p
      JOIN estatusproducto e ON p.id_estatus_producto = e.id_estatus_producto
      JOIN tipoproducto tp ON p.id_tipo_producto = tp.id_tipo_producto
      LEFT JOIN Prioridad pr ON p.id_prioridad = pr.id_prioridad
      LEFT JOIN Equipo eq ON p.id_producto = eq.id_producto
      LEFT JOIN laboratorio le ON eq.id_laboratorio = le.id_laboratorio
      LEFT JOIN Reactivo r ON p.id_producto = r.id_producto
      WHERE p.id_producto = ?
      `,
      [id]
    );

    // DEBUG PARA LABORATORIO
    if (rows.length > 0 && rows[0].id_tipo_producto === 2) {
      console.log("🔍 DEBUG LABORATORIO EN GET:", {
        productoId: id,
        equipo_laboratorio_id: rows[0].equipo_laboratorio_id,
        equipo_laboratorio_nombre: rows[0].equipo_laboratorio_nombre,
        equipo_laboratorio_ubicacion: rows[0].equipo_laboratorio_ubicacion,
        todosLosDatos: rows[0],
      });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("❌ Error en getProductoById:", error);
    res.status(500).json({ error: "Error al obtener producto" });
  }
};

// Crear un nuevo producto
export const createProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      nombre,
      marca,
      lote,
      existencia_actual,
      stock_minimo,
      imagen,
      id_tipo_producto,
      id_prioridad,
      id_usuario,
      // Datos de Equipo
      id_agk,
      modelo,
      numero_serie,
      rango_medicion,
      resolucion,
      intervalo_trabajo,
      id_laboratorio,
      // Datos de Reactivo
      presentacion,
      caducidad,
    } = req.body;

    // ✅ DEBUG: Verificar todos los datos recibidos
    console.log("📦 DATOS RECIBIDOS EN CREATE:", {
      nombre,
      marca,
      id_tipo_producto,
      datosEquipo: {
        id_agk,
        modelo,
        numero_serie,
        rango_medicion,
        resolucion,
        intervalo_trabajo,
        id_laboratorio,
      },
      datosReactivo: {
        presentacion,
        caducidad,
      },
    });

    const [result] = await connection.query(
      `INSERT INTO Producto (nombre, marca, lote, id_prioridad, fecha_ingreso, existencia_actual, stock_minimo, id_estatus_producto, imagen, id_tipo_producto) 
       VALUES (?, ?, ?, ?, NOW(), ?, ?, 1, ?, ?)`, // Estatus inicial siempre es 1 (Disponible)
      [
        nombre,
        marca,
        lote,
        id_prioridad || 2,
        existencia_actual || 0,
        stock_minimo || 0,
        imagen,
        id_tipo_producto,
      ]
    );
    const newProductId = result.insertId;

    console.log("✅ Producto principal creado con ID:", newProductId);

    // Inserción en tabla específica
    if (id_tipo_producto == 1) {
      // REACTIVO
      console.log("🔄 Creando reactivo con fecha:", caducidad);

      const [reactivoResult] = await connection.query(
        `INSERT INTO Reactivo (id_producto, presentacion, caducidad, cantidad_ingresada)
         VALUES (?, ?, ?, ?)`,
        [newProductId, presentacion, caducidad, existencia_actual]
      );

      console.log("✅ Reactivo CREADO:", {
        id: newProductId,
        caducidad,
        affectedRows: reactivoResult.affectedRows,
        insertId: reactivoResult.insertId,
      });
    } else if (id_tipo_producto == 2) {
      // EQUIPO - LÓGICA MEJORADA
      console.log("🔄 Creando equipo con datos:", {
        id_agk,
        modelo,
        numero_serie,
        rango_medicion,
        resolucion,
        intervalo_trabajo,
        id_laboratorio,
      });

      const [equipoResult] = await connection.query(
        `INSERT INTO Equipo (id_producto, id_agk, modelo, numero_serie, rango_medicion, resolucion, intervalo_trabajo, id_laboratorio) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newProductId,
          id_agk || "",
          modelo || "",
          numero_serie || "",
          rango_medicion || "",
          resolucion || "",
          intervalo_trabajo || "",
          id_laboratorio || null,
        ]
      );

      console.log("✅ Equipo CREADO:", {
        affectedRows: equipoResult.affectedRows,
        insertId: equipoResult.insertId,
      });

      // ✅ VERIFICACIÓN POST-CREACIÓN
      const [verificacionEquipo] = await connection.query(
        `SELECT eq.*, l.nombre as lab_nombre 
         FROM Equipo eq 
         LEFT JOIN laboratorio l ON eq.id_laboratorio = l.id_laboratorio 
         WHERE eq.id_producto = ?`,
        [newProductId]
      );
      console.log("✅ VERIFICACIÓN EQUIPO CREADO:", verificacionEquipo[0]);
    }

    // Registrar movimiento inicial solo si hay stock
    if (existencia_actual > 0) {
      await connection.query(
        `INSERT INTO Movimiento (id_producto, id_usuario, id_tipo_movimiento, cantidad, fecha, descripcion_adicional)
         VALUES (?, ?, 1, ?, NOW(), ?)`,
        [
          newProductId,
          id_usuario || 1,
          existencia_actual,
          "Registro inicial de lote en inventario",
        ]
      );
    }

    await connection.commit();

    // ✅ LLAMADA CORRECTA: Llama a la actualización de estatus DESPUÉS de confirmar la transacción.
    updateProductosEstatus().catch((err) =>
      console.error("Error en actualización de estatus post-creación:", err)
    );

    res
      .status(201)
      .json({ id: newProductId, message: "Producto creado exitosamente" });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error al crear producto:", error);
    res
      .status(500)
      .json({ error: "Error al crear producto: " + error.message });
  } finally {
    connection.release();
  }
};

// Actualizar un producto
export const updateProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const {
      nombre,
      marca,
      lote,
      existencia_actual,
      stock_minimo,
      id_estatus_producto,
      imagen,
      id_prioridad,
      id_tipo_producto,
      // Datos de Equipo
      id_agk,
      modelo,
      numero_serie,
      rango_medicion,
      resolucion,
      intervalo_trabajo,
      id_laboratorio,
      // Datos de Reactivo
      presentacion,
      caducidad,
    } = req.body;

    // ✅ DEBUG MEJORADO
    console.log("📅 ACTUALIZACIÓN - DATOS RECIBIDOS:", {
      productoId: id,
      id_tipo_producto,
      datosEquipo: {
        id_agk,
        modelo,
        numero_serie,
        rango_medicion,
        resolucion,
        intervalo_trabajo,
        id_laboratorio,
      },
      datosReactivo: {
        presentacion,
        caducidad,
      },
    });

    // Actualizar producto principal
    const [productoResult] = await connection.query(
      `UPDATE Producto SET nombre = ?, marca = ?, lote = ?, existencia_actual = ?, stock_minimo = ?, 
       id_estatus_producto = ?, imagen = ?, id_prioridad = ?
       WHERE id_producto = ?`,
      [
        nombre,
        marca,
        lote,
        existencia_actual,
        stock_minimo,
        id_estatus_producto,
        imagen,
        id_prioridad,
        id,
      ]
    );

    if (productoResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    console.log("✅ Producto principal actualizado:", {
      affectedRows: productoResult.affectedRows,
    });

    // ✅ SOLUCIÓN CORREGIDA: Usar UPDATE/INSERT explícito
    if (id_tipo_producto == 1) {
      console.log("🔄 Actualizando reactivo...", { id, caducidad });

      // Primero verificar si existe
      const [existing] = await connection.query(
        "SELECT id_producto FROM Reactivo WHERE id_producto = ?",
        [id]
      );

      if (existing.length > 0) {
        // ✅ ACTUALIZAR si existe
        const [updateResult] = await connection.query(
          `UPDATE Reactivo 
           SET presentacion = ?, caducidad = ?, cantidad_ingresada = ?
           WHERE id_producto = ?`,
          [presentacion, caducidad, existencia_actual, id]
        );
        console.log("✅ Reactivo ACTUALIZADO:", {
          affectedRows: updateResult.affectedRows,
          changedRows: updateResult.changedRows,
          caducidadActualizada: caducidad,
        });
      } else {
        // ✅ INSERTAR si no existe
        const [insertResult] = await connection.query(
          `INSERT INTO Reactivo (id_producto, presentacion, caducidad, cantidad_ingresada)
           VALUES (?, ?, ?, ?)`,
          [id, presentacion, caducidad, existencia_actual]
        );
        console.log("✅ Reactivo INSERTADO:", {
          affectedRows: insertResult.affectedRows,
        });
      }

      // ✅ VERIFICAR que se actualizó correctamente
      const [verificacion] = await connection.query(
        "SELECT caducidad FROM Reactivo WHERE id_producto = ?",
        [id]
      );
      console.log("✅ FECHA VERIFICADA EN BD:", verificacion[0]?.caducidad);
    } else if (id_tipo_producto == 2) {
      // EQUIPO - LÓGICA MEJORADA CON VERIFICACIÓN COMPLETA
      const [existingEquipo] = await connection.query(
        "SELECT id_producto, id_laboratorio FROM Equipo WHERE id_producto = ?",
        [id]
      );

      // ✅ DEBUG DETALLADO
      console.log("🔍 DEBUG EQUIPO - ANTES DE ACTUALIZAR:", {
        productoId: id,
        existeEquipo: existingEquipo.length > 0,
        laboratorioActual: existingEquipo[0]?.id_laboratorio,
        datosRecibidos: {
          id_agk,
          modelo,
          numero_serie,
          rango_medicion,
          resolucion,
          intervalo_trabajo,
          id_laboratorio,
        },
      });

      // ✅ FORZAR INSERCIÓN si no existe el equipo
      if (existingEquipo.length === 0) {
        console.log("🆕 INSERTANDO NUEVO REGISTRO EN EQUIPO...");
        const [insertResult] = await connection.query(
          `INSERT INTO Equipo (id_producto, id_agk, modelo, numero_serie, rango_medicion, resolucion, intervalo_trabajo, id_laboratorio)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            id_agk || "",
            modelo || "",
            numero_serie || "",
            rango_medicion || "",
            resolucion || "",
            intervalo_trabajo || "",
            id_laboratorio || null,
          ]
        );
        console.log("✅ Equipo INSERTADO:", {
          affectedRows: insertResult.affectedRows,
          insertId: insertResult.insertId,
        });
      } else {
        // ✅ ACTUALIZAR equipo existente
        const [updateResult] = await connection.query(
          `UPDATE Equipo 
           SET id_agk = ?, modelo = ?, numero_serie = ?, rango_medicion = ?, 
               resolucion = ?, intervalo_trabajo = ?, id_laboratorio = ?
           WHERE id_producto = ?`,
          [
            id_agk || "",
            modelo || "",
            numero_serie || "",
            rango_medicion || "",
            resolucion || "",
            intervalo_trabajo || "",
            id_laboratorio || null,
            id,
          ]
        );
        console.log("✅ Equipo ACTUALIZADO:", {
          affectedRows: updateResult.affectedRows,
          changedRows: updateResult.changedRows,
        });
      }

      // ✅ VERIFICACIÓN POST-ACTUALIZACIÓN
      const [verificacionEquipo] = await connection.query(
        `SELECT eq.*, l.nombre as lab_nombre, l.ubicacion as lab_ubicacion 
         FROM Equipo eq 
         LEFT JOIN laboratorio l ON eq.id_laboratorio = l.id_laboratorio 
         WHERE eq.id_producto = ?`,
        [id]
      );
      console.log("✅ VERIFICACIÓN EQUIPO DESPUÉS:", verificacionEquipo[0]);
    }

    await connection.commit();

    // ✅ ACTUALIZAR ESTATUS INMEDIATAMENTE
    await updateProductosEstatus();

    // Devuelve el producto actualizado para no hacer otra consulta a la BD
    res.json({
      message: "Producto actualizado exitosamente",
      producto: { id, ...req.body },
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error al actualizar producto:", error);
    res
      .status(500)
      .json({ error: "Error al actualizar producto: " + error.message });
  } finally {
    connection.release();
  }
};

// Eliminar un producto
export const deleteProducto = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;

    await connection.query("DELETE FROM Equipo WHERE id_producto = ?", [id]);
    await connection.query("DELETE FROM Reactivo WHERE id_producto = ?", [id]);
    await connection.query("DELETE FROM Material WHERE id_producto = ?", [id]);

    const [result] = await connection.query(
      "DELETE FROM Producto WHERE id_producto = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    await connection.commit();
    res.json({ message: "Producto eliminado exitosamente" });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error al eliminar producto:", error);
    res
      .status(500)
      .json({ error: "Error al eliminar producto: " + error.message });
  } finally {
    connection.release();
  }
};

// Actualizar imagen de un producto
export const updateProductoImagen = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🔍 DEBUG - req.file:", req.file);
    console.log("🔍 DEBUG - req.body:", req.body);

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "No se subió ningún archivo de imagen." });
    }

    // Construir la URL completa de la imagen
    const imageUrl = `http://10.149.121.216:3000/uploads/${req.file.filename}`;

    console.log("🖼️ URL COMPLETA que se guardará:", imageUrl);

    const [result] = await pool.query(
      "UPDATE Producto SET imagen = ? WHERE id_producto = ?",
      [imageUrl, id]
    );

    console.log("📊 Resultado de BD:", result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    // VERIFICAR qué se guardó realmente
    const [verificacion] = await pool.query(
      "SELECT imagen FROM Producto WHERE id_producto = ?",
      [id]
    );
    console.log(
      "✅ VERIFICACIÓN - Lo que se guardó en BD:",
      verificacion[0]?.imagen
    );

    res.json({ message: "Imagen actualizada con éxito", imageUrl });
  } catch (error) {
    console.error("❌ Error al actualizar la imagen:", error);
    res
      .status(500)
      .json({ error: "Error interno del servidor al actualizar la imagen." });
  }
};

// Obtener la tendencia de stock para la gráfica de un producto
export const getProductoStockTrend = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ CONSULTA CORREGIDA - Compatible con todas las versiones de MySQL
    const [rows] = await pool.query(
      `SELECT 
          m.fecha AS x,
          @running_total := @running_total + 
            CASE 
              WHEN m.id_tipo_movimiento = 1 THEN m.cantidad  -- Entrada
              ELSE -m.cantidad                               -- Salida
            END AS y
        FROM 
          Movimiento m
        CROSS JOIN 
          (SELECT @running_total := 0) rt
        WHERE 
          m.id_producto = ?
        ORDER BY 
          m.fecha ASC, m.id_movimiento ASC`,
      [id]
    );

    // Procesar los datos
    const datosProcesados = rows.map((row) => ({
      x: row.x,
      y: Number(row.y) || 0,
    }));

    console.log(`📈 Tendencia de stock para producto ${id}:`, {
      puntos: datosProcesados.length,
      primerPunto: datosProcesados[0],
      ultimoPunto: datosProcesados[datosProcesados.length - 1]
    });

    res.json(datosProcesados);
  } catch (error) {
    console.error("❌ Error en getProductoStockTrend:", error);
    res.status(500).json({ error: "Error al obtener la tendencia de stock" });
  }
};