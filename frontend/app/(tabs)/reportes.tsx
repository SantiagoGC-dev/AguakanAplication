import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  RefreshControl,
  StyleSheet,
  Alert,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Configuración de API
const API_BASE_URL = "http://172.20.10.11:3000/api";

// --- Interfaces ---
interface ProductoGrupo {
  id: string;
  nombre: string;
  tipo: "reactivo" | "material" | "equipo";
  stockActual: number;
  lotes: LoteProducto[];
}

interface LoteProducto {
  id: string;
  lote: string;
  cantidadConsumida?: number;
  stockActual: number;
  fechaCaducidad?: string;
  fechaIngreso: string;
  marca?: string;
  idAgk?: string;
  modelo?: string;
  numeroSerie?: string;
  estatus: "activo" | "inactivo" | "caducado";
  diasRestantes?: number;
}

interface Filtros {
  periodo: string;
  tipoProducto: "todos" | "reactivo" | "material" | "equipo";
}

interface ProductoExpandido {
  [key: string]: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function ReportesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  
  const [refreshing, setRefreshing] = useState(false);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔹 OPTIMIZADO: Usar Set en lugar de objeto para mejor performance
  const [productosExpandidos, setProductosExpandidos] = useState<Set<string>>(
    new Set()
  );

  const [filtros, setFiltros] = useState<Filtros>({
    periodo: "mensual",
    tipoProducto: "todos",
  });

  // Estados para datos reales
  const [productos, setProductos] = useState<ProductoGrupo[]>([]);

  // NUEVO: Estado para paginación
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  // Estados para contadores
  const [contadores, setContadores] = useState({
    todos: 0,
    reactivo: 0,
    material: 0,
    equipo: 0,
  });

  // Estados para selector de fechas
  const [fechaDesdeTemp, setFechaDesdeTemp] = useState(new Date());
  const [fechaHastaTemp, setFechaHastaTemp] = useState(new Date());
  const [fechaDesdeAplicada, setFechaDesdeAplicada] = useState(new Date());
  const [fechaHastaAplicada, setFechaHastaAplicada] = useState(new Date());

  //  Texto del periodo seleccionado
  const [periodoTexto, setPeriodoTexto] = useState("Desde - Hasta");

  //  Función para alternar expansión de productos
  const toggleProductoExpandido = useCallback((productoId: string) => {
    setProductosExpandidos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productoId)) {
        newSet.delete(productoId);
      } else {
        newSet.add(productoId);
      }
      return newSet;
    });
  }, []);

  //  Filtrar productos según los filtros aplicados
  const productosFiltrados = useMemo(() => {
    return productos; // Ya viene filtrado del backend
  }, [productos]);


  const getEstadoStock = (stockActual: number) => {
    if (stockActual === 0) return { estado: "agotado", color: "#EF4444" };
    if (stockActual <= 5) return { estado: "critico", color: "#F59E0B" };
    if (stockActual <= 15) return { estado: "bajo", color: "#F59E0B" };
    return { estado: "normal", color: "#16A34A" };
  };

  // Cargar datos con paginación
  const cargarReportes = async (page = 1, append = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      }

      console.log("🔄 Cargando reportes...", { page, append });

      // Intentar cargar estadísticas (solo en primera página)
      if (page === 1) {
        try {
          const estadisticasResponse = await fetch(
            `${API_BASE_URL}/reportes/estadisticas?${new URLSearchParams({
              fechaDesde: fechaDesdeAplicada.toISOString().split("T")[0],
              fechaHasta: fechaHastaAplicada.toISOString().split("T")[0],
            })}`
          );
          if (estadisticasResponse.ok) {
            const estadisticasData = await estadisticasResponse.json();
            if (estadisticasData.success) {
              setContadores(estadisticasData.data);
              console.log("✅ Estadísticas cargadas:", estadisticasData.data);
            }
          }
        } catch (error) {
          console.warn("⚠️ No se pudieron cargar estadísticas:", error);
        }
      }

      // Cargar productos con paginación
      try {
        const productosResponse = await fetch(
          `${API_BASE_URL}/reportes/productos?${new URLSearchParams({
            tipoProducto: filtros.tipoProducto,
            fechaDesde: fechaDesdeAplicada.toISOString().split("T")[0],
            fechaHasta: fechaHastaAplicada.toISOString().split("T")[0],
            page: page.toString(),
            limit: pagination.limit.toString(),
          })}`
        );

        if (productosResponse.ok) {
          const productosData = await productosResponse.json();
          if (productosData.success) {
            setProductos((prev) =>
              append ? [...prev, ...productosData.data] : productosData.data
            );

            // Actualizar paginación
            setPagination((prev) => ({
              ...prev,
              page: page,
              total: productosData.pagination.total,
              totalPages: productosData.pagination.totalPages,
              hasMore: productosData.pagination.hasMore,
            }));

            console.log(
              `✅ Productos cargados: ${productosData.data.length} (página ${page})`
            );
          } else {
            throw new Error(productosData.error);
          }
        } else {
          throw new Error(`HTTP ${productosResponse.status}`);
        }
      } catch (error) {
        console.error("❌ Error cargando productos:", error);
        if (!append) {
          setProductos([]);
        }
        console.warn("⚠️ No se pudieron cargar productos");
      }

      setLoading(false);
    } catch (error) {
      console.error("💥 Error general cargando reportes:", error);
      setLoading(false);
    }
  };

  // Cargar más productos (infinite scroll)
  const cargarMasProductos = useCallback(() => {
    if (!loading && pagination.hasMore) {
      console.log("📥 Cargando más productos...", pagination.page + 1);
      cargarReportes(pagination.page + 1, true);
    }
  }, [loading, pagination.hasMore, pagination.page]);

  //  Efecto para cargar datos iniciales
  useEffect(() => {
    // Resetear a página 1 cuando cambien los filtros
    setProductos([]);
    setProductosExpandidos(new Set());
    cargarReportes(1, false);
  }, [filtros.tipoProducto, fechaDesdeAplicada, fechaHastaAplicada]);

  // Aplicar filtros desde modal
  const aplicarFiltrosDesdeModal = useCallback(() => {
    if (fechaHastaTemp < fechaDesdeTemp) {
      Alert.alert(
        "Rango inválido",
        "La fecha 'Hasta' no puede ser anterior a la fecha 'Desde'."
      );
      return;
    }

    // Actualizar fechas aplicadas
    setFechaDesdeAplicada(fechaDesdeTemp);
    setFechaHastaAplicada(fechaHastaTemp);

    const desdeTexto = formatearFecha(fechaDesdeTemp);
    const hastaTexto = formatearFecha(fechaHastaTemp);

    setPeriodoTexto(`${desdeTexto} - ${hastaTexto}`);
    setFiltrosVisible(false);
  }, [fechaDesdeTemp, fechaHastaTemp]);

  // Función para exportación a Excel
  const exportarExcel = async () => {
    try {
      Alert.alert(
        "Exportar Reporte",
        "¿Deseas exportar el reporte actual a Excel?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Exportar",
            onPress: async () => {
              try {
                console.log("📤 Iniciando exportación a Excel...");

                const { Linking } = require("react-native");

                // 🔹 USAR PARÁMETROS GET
                const params = new URLSearchParams({
                  tipoProducto: filtros.tipoProducto,
                  fechaDesde: fechaDesdeAplicada.toISOString().split("T")[0],
                  fechaHasta: fechaHastaAplicada.toISOString().split("T")[0],
                });

                const downloadUrl = `${API_BASE_URL}/reportes/exportar/excel?${params}`;

                console.log("🔗 URL de descarga:", downloadUrl);

                // Abrir en el navegador del dispositivo
                const canOpen = await Linking.canOpenURL(downloadUrl);

                if (canOpen) {
                  await Linking.openURL(downloadUrl);
                  Alert.alert(
                    "¡Descarga Iniciada!",
                    "El reporte Excel se está descargando. Revisa las notificaciones de tu dispositivo.",
                    [{ text: "Aceptar" }]
                  );
                } else {
                  Alert.alert(
                    "❌ Error",
                    "No se puede abrir el enlace de descarga.",
                    [{ text: "Aceptar" }]
                  );
                }
              } catch (error: any) {
                console.error("❌ Error exportando Excel:", error);
                Alert.alert(
                  "❌ Error",
                  "No se pudo descargar el Excel: " +
                    (error.message || "Error desconocido"),
                  [{ text: "Aceptar" }]
                );
              }
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", "No se pudo iniciar la exportación");
    }
  };

  // OPTIMIZADO: Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setProductosExpandidos(new Set());
    cargarReportes(1, false).finally(() => {
      setRefreshing(false);
    });
  }, [filtros.tipoProducto, fechaDesdeAplicada, fechaHastaAplicada]);

  // Función para formatear fecha
  const formatearFecha = (fecha: Date) => {
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
    return `${fecha.getDate()}/${
      meses[fecha.getMonth()]
    }/${fecha.getFullYear()}`;
  };

  // OPTIMIZADO: Render Item para productos con React.memo
  const ProductoItem = React.memo(
    ({
      item,
      isExpanded,
      onToggle,
    }: {
      item: ProductoGrupo;
      isExpanded: boolean;
      onToggle: (id: string) => void;
    }) => {
      const { estado, color } = getEstadoStock(item.stockActual);

      return (
        <View style={[styles.productoContainer, isDark && styles.productoContainerDark]}>
          {/* Encabezado del producto */}
          <TouchableOpacity
            style={styles.productoHeader}
            onPress={() => onToggle(item.id)}
          >
            <View style={styles.productoInfo}>
              <ThemedText style={[styles.productoNombre, isDark && styles.textDark]}>
                {item.nombre}
              </ThemedText>
              <View style={styles.productoMeta}>
                <ThemedText style={[styles.productoTipo, isDark && styles.textMutedDark]}>
                  {item.tipo === "reactivo"
                    ? "Reactivo"
                    : item.tipo === "material"
                    ? "Material"
                    : "Equipo"}
                </ThemedText>
                <View style={[styles.separator, isDark && styles.separatorDark]} />
                <ThemedText style={[styles.lotesCount, isDark && styles.textMutedDark]}>
                  {item.lotes.length}{" "}
                  {item.lotes.length === 1 ? "lote" : "lotes"}
                </ThemedText>
              </View>
            </View>
            <View style={styles.productoActions}>
              <View
                style={[styles.stockBadge, { backgroundColor: isDark ? "#2c2c2e" : "#f6f6f6ff" }]}
              >
                <ThemedText style={[styles.stockText, { color: "#539DF3" }]}>
                  {item.stockActual} unidades
                </ThemedText>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={isDark ? "#888" : "#64748B"}
              />
            </View>
          </TouchableOpacity>

          {/* Detalles expandidos */}
          {isExpanded && (
            <View style={[styles.lotesContainer, isDark && styles.lotesContainerDark]}>
              {/* Header específico por tipo */}
              <View style={[styles.tableHeader, isDark && styles.tableHeaderDark]}>
                {item.tipo === "reactivo" && (
                  <>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>Lote</ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      Consumido
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      Stock
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      F. Ingreso
                    </ThemedText>
                  </>
                )}
                {item.tipo === "material" && (
                  <>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>Lote</ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      Marca
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      Stock
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      F. Ingreso
                    </ThemedText>
                  </>
                )}
                {item.tipo === "equipo" && (
                  <>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      Marca/Modelo
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      ID AGK
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      No. Serie
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      Estatus
                    </ThemedText>
                    <ThemedText style={[styles.tableHeaderText, isDark && styles.textMutedDark]}>
                      F. Ingreso
                    </ThemedText>
                  </>
                )}
              </View>
              {/* Lotes */}
              {item.lotes.map((lote) => (
                <View key={lote.id} style={[styles.loteRow, isDark && styles.loteRowDark]}>
                  {item.tipo === "reactivo" && (
                    <>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.lote}
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.cantidadConsumida || 0}u
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.stockActual}u
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.fechaIngreso}
                      </ThemedText>
                    </>
                  )}
                  {item.tipo === "material" && (
                    <>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.lote}
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.marca}
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.stockActual}u
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.fechaIngreso}
                      </ThemedText>
                    </>
                  )}
                  {item.tipo === "equipo" && (
                    <>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.marca} / {lote.modelo}
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.idAgk}
                      </ThemedText>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.numeroSerie}
                      </ThemedText>
                      <View
                        style={[
                          styles.estadoBadge,
                          {
                            backgroundColor:
                              lote.estatus === "activo"
                                ? isDark ? "#10B98130" : "#10B98115"
                                : isDark ? "#6B728030" : "#6B728015",
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.estadoText,
                            {
                              color:
                                lote.estatus === "activo"
                                  ? "#10B981"
                                  : "#6B7280",
                            },
                          ]}
                        >
                          {lote.estatus === "activo" ? "Activo" : "Inactivo"}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.loteText, isDark && styles.textMutedDark]}>
                        {lote.fechaIngreso}
                      </ThemedText>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      );
    }
  );

  // OPTIMIZADO: Render item con useCallback
  const renderProductoItem = useCallback(
    ({ item }: { item: ProductoGrupo }) => (
      <ProductoItem
        item={item}
        isExpanded={productosExpandidos.has(item.id)}
        onToggle={toggleProductoExpandido}
      />
    ),
    [productosExpandidos, toggleProductoExpandido, isDark]
  );

  // NUEVO: Footer para loading de más datos
  const renderFooter = useCallback(() => {
    if (!pagination.hasMore) return null;

    return (
      <View style={styles.footerLoading}>
        <ThemedText style={[styles.footerText, isDark && styles.textMutedDark]}>
          Cargando más productos...
        </ThemedText>
      </View>
    );
  }, [pagination.hasMore, isDark]);

  const renderListHeader = () => (
    <>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={[styles.headerTitle, isDark && styles.textDark]}>
            Reportes
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.filterButton, isDark && styles.filterButtonDark]}
              onPress={() => setFiltrosVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color={isDark ? "#fff" : "#1E293B"} />
              <ThemedText style={[styles.filterText, isDark && styles.textDark]}>Filtrar Periodo</ThemedText>
              <Ionicons name="chevron-down" size={16} color={isDark ? "#fff" : "#1E293B"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Periodo actual */}
        <View style={styles.periodoContainer}>
          <ThemedText style={[styles.periodoText, isDark && styles.textMutedDark]}>
            Periodo: {periodoTexto}
          </ThemedText>
        </View>

        {/* Botones de exportar */}
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButtonBig, isDark && styles.exportButtonBigDark]}
            onPress={exportarExcel}
          >
            <Ionicons name="stats-chart-outline" size={20} color="#5CB85C" />
            <ThemedText style={[styles.exportButtonText, isDark && styles.textDark]}>
              Exportar (Excel)
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros por tipo de producto */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[
            styles.filtroCard,
            isDark && styles.filtroCardDark,
            filtros.tipoProducto === "todos" && styles.filtroCardActive,
          ]}
          onPress={() =>
            setFiltros((prev) => ({ ...prev, tipoProducto: "todos" }))
          }
        >
          <Ionicons
            name="grid-outline"
            size={24}
            color={filtros.tipoProducto === "todos" ? "#FFFFFF" : "#4B9CD3"}
          />
          <ThemedText
            style={[
              styles.filtroNumber,
              filtros.tipoProducto === "todos" && styles.filtroNumberActive,
            ]}
          >
            {contadores.todos}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              filtros.tipoProducto === "todos" && styles.filtroLabelActive,
            ]}
          >
            Todos
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroCard,
            isDark && styles.filtroCardDark,
            filtros.tipoProducto === "reactivo" && styles.filtroCardActive,
          ]}
          onPress={() =>
            setFiltros((prev) => ({ ...prev, tipoProducto: "reactivo" }))
          }
        >
          <Ionicons
            name="color-fill-outline"
            size={24}
            color={filtros.tipoProducto === "reactivo" ? "#FFFFFF" : "#8B5CF6"}
          />
          <ThemedText
            style={[
              styles.filtroNumber,
              isDark && styles.filtroNumberDark,
              filtros.tipoProducto === "reactivo" && styles.filtroNumberActive,
            ]}
          >
            {contadores.reactivo}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              isDark && styles.filtroLabelDark,
              filtros.tipoProducto === "reactivo" && styles.filtroLabelActive,
            ]}
          >
            Reactivos
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroCard,
            isDark && styles.filtroCardDark,
            filtros.tipoProducto === "material" && styles.filtroCardActive,
          ]}
          onPress={() =>
            setFiltros((prev) => ({ ...prev, tipoProducto: "material" }))
          }
        >
          <Ionicons
            name="flask-outline"
            size={24}
            color={filtros.tipoProducto === "material" ? "#FFFFFF" : "#10B981"}
          />
          <ThemedText
            style={[
              styles.filtroNumber,
              isDark && styles.filtroNumberDark,
              filtros.tipoProducto === "material" && styles.filtroNumberActive,
            ]}
          >
            {contadores.material}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              isDark && styles.filtroLabelDark,
              filtros.tipoProducto === "material" && styles.filtroLabelActive,
            ]}
          >
            Materiales
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroCard,
            isDark && styles.filtroCardDark,
            filtros.tipoProducto === "equipo" && styles.filtroCardActive,
          ]}
          onPress={() =>
            setFiltros((prev) => ({ ...prev, tipoProducto: "equipo" }))
          }
        >
          <Ionicons
            name="hardware-chip-outline"
            size={24}
            color={filtros.tipoProducto === "equipo" ? "#FFFFFF" : "#3B82F6"}
          />
          <ThemedText
            style={[
              styles.filtroNumber,
              isDark && styles.filtroNumberDark,
              filtros.tipoProducto === "equipo" && styles.filtroNumberActive,
            ]}
          >
            {contadores.equipo}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              isDark && styles.filtroLabelDark,
              filtros.tipoProducto === "equipo" && styles.filtroLabelActive,
            ]}
          >
            Equipos
          </ThemedText>
        </TouchableOpacity>
      </View>
    </>
  );

  // --- Pantalla de Carga ---
  if (loading && productos.length === 0) {
    return (
      <View style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}>
        <View style={styles.loadingContent}>
          <Ionicons name="document-text" size={48} color="#4B9CD3" />
          <ThemedText type="title" style={styles.loadingText}>
            Cargando reportes...
          </ThemedText>
        </View>
      </View>
    );
  }

  // --- Render Principal ---
  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* FLATLIST OPTIMIZADA CON PAGINACIÓN */}
      <FlatList
        // --- Props de Datos ---
        data={productosFiltrados}
        keyExtractor={(item) => item.id}
        renderItem={renderProductoItem}
        // --- Props de Header y Footer ---
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderFooter}
        // --- Prop de Estado Vacío ---
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color={isDark ? "#666" : "#64748B"}
              />
              <ThemedText style={[styles.emptyStateText, isDark && styles.textMutedDark]}>
                No hay productos para mostrar con los filtros actuales
              </ThemedText>
            </View>
          ) : null
        }
        // --- Props de Scroll y Refresh ---
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={isDark ? "#fff" : "#000"}
          />
        }
        // OPTIMIZACIONES DE PERFORMANCE
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={100}
        // INFINITE SCROLL
        onEndReached={cargarMasProductos}
        onEndReachedThreshold={0.3}
        // --- Estilos ---
        contentContainerStyle={styles.listContent}
        style={[styles.flatList, isDark && styles.flatListDark]}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal de Filtros de Periodo */}
      <Modal visible={filtrosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
              <ThemedText type="title" style={[styles.modalTitle, isDark && styles.textDark]}>
                Periodo del Reporte
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFiltrosVisible(false)}
              >
                <Ionicons name="close" size={24} color={isDark ? "#fff" : "#666"} />
              </TouchableOpacity>
            </View>

            <View style={styles.periodoOptions}>
              <ThemedText style={[styles.label, isDark && styles.textDark]}>Desde:</ThemedText>
              <DateTimePicker
                value={fechaDesdeTemp}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => date && setFechaDesdeTemp(date)}
                style={[styles.datePicker, isDark && styles.datePickerDark]}
              />

              <ThemedText style={[styles.label, { marginTop: 10 }, isDark && styles.textDark]}>
                Hasta:
              </ThemedText>
              <DateTimePicker
                value={fechaHastaTemp}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => date && setFechaHastaTemp(date)}
                style={[styles.datePicker, isDark && styles.datePickerDark]}
              />
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={aplicarFiltrosDesdeModal}
              >
                <ThemedText style={styles.applyBtnText}>
                  Aplicar Periodo
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  containerDark: {
    backgroundColor: "#000",
  },
  flatList: {
    flex: 1,
  },
  flatListDark: {
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingContainerDark: {
    backgroundColor: "#000",
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Poppins_500Medium",
    color: "#539DF3",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerDark: {
    backgroundColor: "#000000ff",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 25,
    color: "#000000",
    fontFamily: "Poppins_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterButtonDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
  },
  filterText: {
    fontSize: 12,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  exportButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  exportButtonBig: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    height: 38,
    flex: 1,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
  },
  exportButtonBigDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
  },
  exportButtonText: {
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  periodoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  periodoText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
  },
  paginationInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  paginationText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  footerLoading: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
  },
  filtrosContainer: {
    flexDirection: "row",
    paddingHorizontal: 1,
    paddingVertical: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  filtroCard: {
    minWidth: 70,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    flex: 1,
  },
  filtroCardDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
  },
  filtroCardActive: {
    backgroundColor: "#539DF3",
    shadowColor: "#539DF3",
    shadowOpacity: 0.2,
    elevation: 4,
  },
  filtroNumber: {
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Poppins_700Bold",
  },
  filtroNumberDark: {
    color: "#CCCCCC",
  },
  filtroNumberActive: {
    color: "#FFFFFF",
  },
  filtroLabel: {
    fontSize: 10,
    color: "#000000ff",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
  },
  filtroLabelDark: {
    color: "#FFFFFF",
  },
  filtroLabelActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
  },
  productoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0.1,
    borderColor: "#E0E0E0",
  },
  productoContainerDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  productoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  productoInfo: {
    flex: 1,
    gap: 4,
  },
  productoNombre: {
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  productoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  productoTipo: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
  },
  separatorDark: {
    backgroundColor: "#333",
  },
  lotesCount: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  productoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
  },
  lotesContainer: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  lotesContainerDark: {
    backgroundColor: "#2c2c2e",
    borderTopColor: "#333",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 6,
  },
  tableHeaderDark: {
    borderBottomColor: "#333",
  },
  tableHeaderText: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    flex: 1,
  },
  loteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  loteRowDark: {
    borderBottomColor: "#333",
  },
  loteText: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    flex: 1,
  },
  estadoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "center",
  },
  estadoText: {
    fontSize: 8,
    fontFamily: "Poppins_500Medium",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: "80%",
  },
  modalContentDark: {
    backgroundColor: "#1c1c1e",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalHeaderDark: {
    borderBottomColor: "#333",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  periodoOptions: {
    padding: 20,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  filterActions: {
    paddingHorizontal: 20,
  },
  applyBtn: {
    backgroundColor: "#539DF3",
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#539DF3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#fff",
  },
  label: {
    fontSize: 14,
    color: "#475569",
    fontFamily: "Poppins_500Medium",
    alignSelf: "flex-start",
  },
  datePicker: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    width: "100%",
  },
  datePickerDark: {
    backgroundColor: "#2c2c2e",
  },
  spacer: {
    height: Platform.OS === "ios" ? 30 : 20,
  },

  // Text Colors
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});