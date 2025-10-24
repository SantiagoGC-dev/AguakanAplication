import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  RefreshControl,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";

// Configuración de API
const API_BASE_URL = "http://192.168.0.166:3000/api";

interface ProductoConsumo {
  id: string;
  nombre: string;
  cantidad: string;
  fecha: string;
}

interface ProductoCaducar {
  id: string;
  nombre: string;
  lote: string;
  fechaCaducidad: string;
  diasRestantes: number;
}

interface StockActual {
  id: string;
  nombre: string;
  existencia: number;
  cantidadMinima: number;
  estado: 'normal' | 'bajo' | 'critico';
}

interface Filtros {
  periodo: string;
  tipoReporte: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function ReportesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [filtros, setFiltros] = useState<Filtros>({
    periodo: "trimestral",
    tipoReporte: "todos",
  });

  // Datos estáticos según la imagen
  const [consumoProductos, setConsumoProductos] = useState<ProductoConsumo[]>([
    { id: '1', nombre: 'Agua destinada', cantidad: '12 litros', fecha: 'Septiembre-Diciembre' },
    { id: '2', nombre: 'Guantes de lotex estéril totala', cantidad: '120 piezas', fecha: 'Septiembre-Diciembre' },
    { id: '3', nombre: 'Guantes de lotex estéril totala CH', cantidad: '100 piezas', fecha: 'Septiembre-Diciembre' },
    { id: '4', nombre: 'Ácido glutámico', cantidad: '9 litros', fecha: 'Septiembre-Diciembre' },
  ]);

  const [productosProximosCaducar, setProductosProximosCaducar] = useState<ProductoCaducar[]>([
    { id: '1', nombre: 'Acielo glutámico', lote: 'ABC123', fechaCaducidad: '12/Noviembre/2025', diasRestantes: 20 },
    { id: '2', nombre: 'Detergente neutro', lote: 'DIF.456', fechaCaducidad: '11/Noviembre/2025', diasRestantes: 19 },
    { id: '3', nombre: 'Agua destinada', lote: '798cH1', fechaCaducidad: '8/Noviembre/2025', diasRestantes: 16 },
    { id: '4', nombre: 'Sulfato de potasio', lote: '220CC3', fechaCaducidad: '8/Noviembre/2025', diasRestantes: 16 },
  ]);

  const [stockActual, setStockActual] = useState<StockActual[]>([
    { id: '1', nombre: 'Agua destinada', existencia: 12, cantidadMinima: 6, estado: 'normal' },
    { id: '2', nombre: 'Motroz Eférmeyer', existencia: 120, cantidadMinima: 2, estado: 'normal' },
    { id: '3', nombre: 'Guantes de lotex estéril totala CH', existencia: 100, cantidadMinima: 2, estado: 'normal' },
    { id: '4', nombre: 'Ácido glutámico', existencia: 9, cantidadMinima: 10, estado: 'bajo' },
  ]);

  // 🔹 Función para fetch de datos optimizada
  const fetchData = useCallback(async (endpoint: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`❌ Error en ${endpoint}:`, error);
      throw error;
    }
  }, []);

  // 🔹 Cargar reportes desde el backend
  const fetchReportes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando reportes...');

      // Construir URL con parámetros
      const params = new URLSearchParams({
        periodo: filtros.periodo,
        tipoReporte: filtros.tipoReporte
      });

      // Aquí irían las llamadas reales a la API
      // const reportesData = await fetchData(`/reportes?${params}`);
      
      // Por ahora usamos datos estáticos
      console.log('✅ Reportes cargados');
      
    } catch (error) {
      console.error("❌ Error cargando reportes:", error);
      Alert.alert("Error", "No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchData, filtros]);

  // 🔹 Actualizar estado de filtros aplicados
  useEffect(() => {
    const hayFiltrosActivos =
      filtros.periodo !== "trimestral" ||
      filtros.tipoReporte !== "todos";

    setFiltrosAplicados(hayFiltrosActivos);
  }, [filtros]);

  // 🔹 Resetear filtros
  const resetearFiltros = useCallback(() => {
    setFiltros({
      periodo: "trimestral",
      tipoReporte: "todos",
    });
    setFiltrosAplicados(false);
  }, []);

  // 🔹 Aplicar filtros desde modal
  const aplicarFiltrosDesdeModal = useCallback(() => {
    setFiltrosVisible(false);
    fetchReportes();
  }, [fetchReportes]);

  // 🔹 Función para determinar el color según los días restantes
  const getColorCaducidad = useCallback((dias: number) => {
    if (dias <= 7) return "#EF4444"; // rojo
    if (dias <= 30) return "#F59E0B"; // amarillo
    return "#16A34A"; // verde
  }, []);

  // 🔹 Función para determinar el estado del stock
  const getEstadoStock = useCallback((existencia: number, minimo: number) => {
    if (existencia <= minimo * 0.3) return { estado: 'critico', color: "#EF4444" };
    if (existencia <= minimo) return { estado: 'bajo', color: "#F59E0B" };
    return { estado: 'normal', color: "#16A34A" };
  }, []);

  // 🔹 Funciones de exportación
  const exportarPDF = useCallback(() => {
    console.log('📊 Exportando a PDF...');
    Alert.alert("Éxito", "Reporte exportado a PDF correctamente");
  }, []);

  const exportarExcel = useCallback(() => {
    console.log('📊 Exportando a Excel...');
    Alert.alert("Éxito", "Reporte exportado a Excel correctamente");
  }, []);

  // 🔹 Cargar datos al montar
  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  // 🔹 Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReportes();
  }, [fetchReportes]);

  if (loading && consumoProductos.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="document-text" size={48} color="#4B9CD3" />
          <ThemedText type="title" style={styles.loadingText}>
            Cargando reportes...
          </ThemedText>
        </View>
      </View>
    );
  }

  // 🔹 Render Item para Consumo de Productos
  const renderConsumoItem = useCallback(({ item }: { item: ProductoConsumo }) => (
    <View style={styles.tableRow}>
      <View style={[styles.tableCell, { flex: 2 }]}>
        <ThemedText style={styles.productoNombre}>{item.nombre}</ThemedText>
      </View>
      <View style={[styles.tableCell, { flex: 1 }]}>
        <ThemedText style={styles.cantidadText}>{item.cantidad}</ThemedText>
      </View>
      <View style={[styles.tableCell, { flex: 1.5 }]}>
        <ThemedText style={styles.fechaText}>{item.fecha}</ThemedText>
      </View>
    </View>
  ), []);

  // 🔹 Render Item para Productos a Caducar
  const renderCaducarItem = useCallback(({ item }: { item: ProductoCaducar }) => {
    const color = getColorCaducidad(item.diasRestantes);
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 2 }]}>
          <ThemedText style={styles.productoNombre}>{item.nombre}</ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <ThemedText style={styles.loteText}>{item.lote}</ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1.2 }]}>
          <ThemedText style={styles.fechaText}>{item.fechaCaducidad}</ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 0.8 }]}>
          <View style={[styles.estadoBadge, { backgroundColor: color + "15" }]}>
            <ThemedText style={[styles.estadoText, { color }]}>
              {item.diasRestantes}d
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }, [getColorCaducidad]);

  // 🔹 Render Item para Stock Actual
  const renderStockItem = useCallback(({ item }: { item: StockActual }) => {
    const { estado, color } = getEstadoStock(item.existencia, item.cantidadMinima);
    const estadoText = estado === 'critico' ? 'Crítico' : estado === 'bajo' ? 'Bajo' : 'Normal';
    
    return (
      <View style={styles.tableRow}>
        <View style={[styles.tableCell, { flex: 2 }]}>
          <ThemedText style={styles.productoNombre}>{item.nombre}</ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <ThemedText style={styles.cantidadText}>{item.existencia} unidades</ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <ThemedText style={styles.cantidadText}>{item.cantidadMinima} unidades</ThemedText>
        </View>
        <View style={[styles.tableCell, { flex: 1 }]}>
          <View style={[styles.estadoBadge, { backgroundColor: color + "15" }]}>
            <ThemedText style={[styles.estadoText, { color }]}>
              {estadoText}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }, [getEstadoStock]);

  return (
    <View style={styles.container}>
      {/* 🔹 Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Reportes
        </ThemedText>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filtrosAplicados && styles.filterButtonActive,
            ]}
            onPress={() => setFiltrosVisible(true)}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filtrosAplicados ? "#fff" : "#1E293B"}
            />
            <ThemedText
              style={[
                styles.filterText,
                filtrosAplicados && styles.filterTextActive,
              ]}
            >
              {filtros.periodo === "trimestral" ? "Trimestral" : 
               filtros.periodo === "mensual" ? "Mensual" : "Personalizado"}
            </ThemedText>
            <Ionicons 
              name="chevron-down" 
              size={16} 
              color={filtrosAplicados ? "#fff" : "#1E293B"} 
            />
          </TouchableOpacity>

          <View style={styles.exportButtons}>
            <TouchableOpacity style={styles.exportButton} onPress={exportarPDF}>
              <Ionicons name="document-outline" size={18} color="#4B9CD3" />
              <ThemedText style={styles.exportButtonText}>PDF</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.exportButton} onPress={exportarExcel}>
              <Ionicons name="tablet-landscape-outline" size={18} color="#4B9CD3" />
              <ThemedText style={styles.exportButtonText}>Excel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 🔹 Badge de filtros activos */}
      {filtrosAplicados && (
        <View style={styles.badgeContainer}>
          <TouchableOpacity
            style={styles.filtrosActivosBadge}
            onPress={resetearFiltros}
          >
            <ThemedText style={styles.filtrosActivosText}>
              Filtros activos
            </ThemedText>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* 🔹 Contenido de Reportes */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 🔹 Sección: Consumo de productos */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Consumo de productos
          </ThemedText>
          
          <View style={styles.tableContainer}>
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { flex: 2 }]}>
                <ThemedText style={styles.tableHeaderText}>Producto</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.tableHeaderText}>Cantidad</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.5 }]}>
                <ThemedText style={styles.tableHeaderText}>Fecha</ThemedText>
              </View>
            </View>

            {/* Contenido de la tabla */}
            <FlatList
              data={consumoProductos}
              keyExtractor={(item) => item.id}
              renderItem={renderConsumoItem}
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* 🔹 Sección: Productos próximos a caducar */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Productos próximos a caducar
          </ThemedText>
          
          <View style={styles.tableContainer}>
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { flex: 2 }]}>
                <ThemedText style={styles.tableHeaderText}>Producto</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.tableHeaderText}>Lote</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1.2 }]}>
                <ThemedText style={styles.tableHeaderText}>Fecha a caducar</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                <ThemedText style={styles.tableHeaderText}>Estado</ThemedText>
              </View>
            </View>

            {/* Contenido de la tabla */}
            <FlatList
              data={productosProximosCaducar}
              keyExtractor={(item) => item.id}
              renderItem={renderCaducarItem}
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* 🔹 Sección: Stock actual */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Stock actual
          </ThemedText>
          
          <View style={styles.tableContainer}>
            {/* Header de la tabla */}
            <View style={styles.tableHeader}>
              <View style={[styles.tableHeaderCell, { flex: 2 }]}>
                <ThemedText style={styles.tableHeaderText}>Producto</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.tableHeaderText}>Existencia</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.tableHeaderText}>Cantidad mínima</ThemedText>
              </View>
              <View style={[styles.tableHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.tableHeaderText}>Estado</ThemedText>
              </View>
            </View>

            {/* Contenido de la tabla */}
            <FlatList
              data={stockActual}
              keyExtractor={(item) => item.id}
              renderItem={renderStockItem}
              scrollEnabled={false}
            />
          </View>
        </View>

        {/* 🔹 Alertas importantes */}
        <View style={styles.alertasContainer}>
          <View style={[styles.alerta, styles.alertaWarning]}>
            <Ionicons name="warning-outline" size={20} color="#F59E0B" />
            <ThemedText style={styles.alertaText}>
              <ThemedText type="defaultSemiBold">Ácido glutámico</ThemedText> - El stock actual está por debajo del mínimo requerido
            </ThemedText>
          </View>
          
          <View style={[styles.alerta, styles.alertaError]}>
            <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            <ThemedText style={styles.alertaText}>
              <ThemedText type="defaultSemiBold">Productos próximos a caducar</ThemedText> - 4 productos caducarán en los próximos 30 días
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* 🔹 Modal de Filtros */}
      <Modal visible={filtrosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Filtros de Reportes
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFiltrosVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersScroll}>
              {/* Filtro: Periodo */}
              <View style={styles.filterCard}>
                <ThemedText type="defaultSemiBold" style={styles.filterCardTitle}>
                  Selección de periodo
                </ThemedText>
                <View style={styles.filterOptions}>
                  {[
                    { value: "mensual", label: "Mensual" },
                    { value: "trimestral", label: "Trimestral" },
                    { value: "semestral", label: "Semestral" },
                    { value: "anual", label: "Anual" },
                    { value: "personalizado", label: "Personalizado" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filtros.periodo === option.value && styles.filterOptionActive,
                      ]}
                      onPress={() => {
                        setFiltros((prev) => ({
                          ...prev,
                          periodo: option.value,
                        }));
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          filtros.periodo === option.value && styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro: Tipo de Reporte */}
              <View style={styles.filterCard}>
                <ThemedText type="defaultSemiBold" style={styles.filterCardTitle}>
                  Tipo de Reporte
                </ThemedText>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      filtros.tipoReporte === "todos" && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setFiltros((prev) => ({
                        ...prev,
                        tipoReporte: "todos",
                      }));
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.filterOptionText,
                        filtros.tipoReporte === "todos" && styles.filterOptionTextActive,
                      ]}
                    >
                      Todos los reportes
                    </ThemedText>
                  </TouchableOpacity>
                  {["consumo", "caducidad", "stock", "movimientos"].map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.filterOption,
                        filtros.tipoReporte === tipo && styles.filterOptionActive,
                      ]}
                      onPress={() => {
                        setFiltros((prev) => ({
                          ...prev,
                          tipoReporte: prev.tipoReporte === tipo ? "todos" : tipo,
                        }));
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          filtros.tipoReporte === tipo && styles.filterOptionTextActive,
                        ]}
                      >
                        {tipo === "consumo" && "Consumo de productos"}
                        {tipo === "caducidad" && "Productos a caducar"}
                        {tipo === "stock" && "Stock actual"}
                        {tipo === "movimientos" && "Movimientos"}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setFiltros({
                    periodo: "trimestral",
                    tipoReporte: "todos",
                  });
                }}
              >
                <ThemedText style={styles.resetBtnText}>
                  Limpiar Filtros
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={aplicarFiltrosDesdeModal}
              >
                <ThemedText style={styles.applyBtnText}>
                  Aplicar Filtros
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
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 20 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Poppins_500Medium",
    color: "#4B9CD3",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 23,
    color: "#000000ff",
    fontFamily: "Poppins_700Bold",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 36,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: "#539DF3",
  },
  filterText: {
    fontSize: 12,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  exportButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonText: {
    fontSize: 12,
    color: "#4B9CD3",
    fontFamily: "Poppins_500Medium",
  },
  badgeContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  filtrosActivosBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#539DF3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filtrosActivosText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    marginRight: 6,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: "#000000ff",
    marginBottom: 12,
    fontFamily: "Poppins_600SemiBold",
  },
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableHeaderCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  tableHeaderText: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#F1F5F9",
    justifyContent: "center",
  },
  productoNombre: {
    fontSize: 12,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  cantidadText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  fechaText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  loteText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "center",
  },
  estadoText: {
    fontSize: 10,
    fontFamily: "Poppins_600SemiBold",
    textAlign: "center",
  },
  alertasContainer: {
    gap: 12,
    marginBottom: 24,
  },
  alerta: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  alertaWarning: {
    backgroundColor: "#FEF3CD",
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  alertaError: {
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  alertaText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    lineHeight: 16,
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  filtersScroll: {
    maxHeight: 400,
    paddingVertical: 8,
  },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  filterCardTitle: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    color: "#374151",
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  filterOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterOptionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterOptionTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  applyBtn: {
    flex: 1,
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
  resetBtnText: {
    fontWeight: "600",
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },
  applyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
});