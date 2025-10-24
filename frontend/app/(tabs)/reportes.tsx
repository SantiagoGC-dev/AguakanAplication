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
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
const { width: screenWidth } = Dimensions.get("window");

// Configuración de API
const API_BASE_URL = "http://172.20.10.11:3000/api";

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

export default function ReportesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [productosExpandidos, setProductosExpandidos] =
    useState<ProductoExpandido>({});
  const [filtros, setFiltros] = useState<Filtros>({
    periodo: "mensual",
    tipoProducto: "todos",
  });
  // Datos de ejemplo según la nueva estructura
  const [productos, setProductos] = useState<ProductoGrupo[]>([
    {
      id: "1",
      nombre: "Agua destilada",
      tipo: "reactivo",
      stockActual: 12,
      lotes: [
        {
          id: "1-1",
          lote: "ABC123",
          cantidadConsumida: 5,

          stockActual: 7,
          fechaCaducidad: "12/Nov/2025",
          fechaIngreso: "01/Ene/2024",
          estatus: "activo",
          diasRestantes: 20,
        },
        {
          id: "1-2",
          lote: "DEF456",
          cantidadConsumida: 3,

          stockActual: 5,
          fechaCaducidad: "15/Dic/2025",
          fechaIngreso: "01/Feb/2024",
          estatus: "activo",
          diasRestantes: 53,
        },
      ],
    },
    {
      id: "2",
      nombre: "Guantes de látex estéril",
      tipo: "material",

      stockActual: 120,
      lotes: [
        {
          id: "2-1",
          lote: "MAT001",
          stockActual: 80,
          fechaIngreso: "15/Mar/2024",
          marca: "MediSafe",
          estatus: "activo",
        },

        {
          id: "2-2",
          lote: "MAT002",
          stockActual: 40,
          fechaIngreso: "20/Abr/2024",
          marca: "MediSafe",
          estatus: "activo",
        },
      ],
    },
    {
      id: "3",

      nombre: "Centrífuga de laboratorio",
      tipo: "equipo",
      stockActual: 2,
      lotes: [
        {
          id: "3-1",
          lote: "EQP001",
          stockActual: 1,
          fechaIngreso: "10/Ene/2024",
          marca: "LabTech",

          idAgk: "AGK-CENT-001",
          modelo: "CT-5000",
          numeroSerie: "SN123456",
          estatus: "activo",
        },
        {
          id: "3-2",
          lote: "EQP002",
          stockActual: 1,
          fechaIngreso: "15/Feb/2024",

          marca: "LabTech",
          idAgk: "AGK-CENT-002",
          modelo: "CT-5000",
          numeroSerie: "SN123457",
          estatus: "inactivo",
        },
      ],
    },
    {
      id: "4",
      nombre: "Ácido glutámico",
      tipo: "reactivo",

      stockActual: 9,
      lotes: [
        {
          id: "4-1",
          lote: "ACD001",
          cantidadConsumida: 2,
          stockActual: 3,
          fechaCaducidad: "08/Nov/2025",
          fechaIngreso: "01/Mar/2024",
          estatus: "activo",

          diasRestantes: 16,
        },
      ],
    },
    {
      id: "5",
      nombre: "Jeringas desechables",
      tipo: "material",
      stockActual: 200,
      lotes: [
        {
          id: "5-1",
          lote: "MAT003",

          stockActual: 200,
          fechaIngreso: "05/May/2024",
          marca: "SafeMed",
          estatus: "activo",
        },
      ],
    },
  ]);
  // 🔹 Función para alternar expansión de productos
  const toggleProductoExpandido = useCallback((productoId: string) => {
    setProductosExpandidos((prev) => ({
      ...prev,
      [productoId]: !prev[productoId],
    }));
  }, []);
  // 🔹 Filtrar productos según los filtros aplicados
  const productosFiltrados = useMemo(() => {
    if (filtros.tipoProducto === "todos") {
      return productos;
    }
    return productos.filter(
      (producto) => producto.tipo === filtros.tipoProducto
    );
  }, [productos, filtros.tipoProducto]);
  // 🔹 Función para determinar el color según los días restantes
  const getColorCaducidad = useCallback((dias?: number) => {
    if (!dias) return "#6B7280";
    if (dias <= 7) return "#EF4444";
    if (dias <= 30) return "#F59E0B";
    return "#16A34A";
  }, []);
  // 🔹 Función para determinar el estado del stock
  const getEstadoStock = useCallback((stockActual: number) => {
    if (stockActual === 0) return { estado: "agotado", color: "#EF4444" };
    if (stockActual <= 5) return { estado: "critico", color: "#F59E0B" };
    if (stockActual <= 15) return { estado: "bajo", color: "#F59E0B" };
    return { estado: "normal", color: "#16A34A" };
  }, []);
  // 🔹 Función para obtener texto del periodo (Eliminada, ya no se usa)
  // 🔹 Contadores por tipo
  const contadores = useMemo(
    () => ({
      todos: productos.length,
      reactivo: productos.filter((p) => p.tipo === "reactivo").length,
      material: productos.filter((p) => p.tipo === "material").length,
      equipo: productos.filter((p) => p.tipo === "equipo").length,
    }),
    [productos]
  );
  // 🔹 Cargar datos al montar
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);
  // 🔹 Aplicar filtros desde modal
  const aplicarFiltrosDesdeModal = useCallback(() => {
    setFiltrosVisible(false);
  }, []);
  // 🔹 Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  // 🔹 Funciones de exportación
  const exportarPDF = useCallback(() => {
    Alert.alert("Éxito", "Reporte exportado a PDF correctamente");
  }, []);
  const exportarExcel = useCallback(() => {
    Alert.alert("Éxito", "Reporte exportado a Excel correctamente");
  }, []);
  // 🔹 Render Item para productos
  const renderProductoItem = useCallback(
    ({ item }: { item: ProductoGrupo }) => {
      const isExpanded = productosExpandidos[item.id];
      const { estado, color } = getEstadoStock(item.stockActual);
      const estadoText =
        estado === "agotado"
          ? "Agotado"
          : estado === "critico"
          ? "Crítico"
          : estado === "bajo"
          ? "Bajo"
          : "Normal";

      return (
        <View style={styles.productoContainer}>
          {/* Encabezado del producto */}
          <TouchableOpacity
            style={styles.productoHeader}
            onPress={() => toggleProductoExpandido(item.id)}
          >
            <View style={styles.productoInfo}>
              <ThemedText style={styles.productoNombre}>
                {item.nombre}
              </ThemedText>

              <View style={styles.productoMeta}>
                <ThemedText style={styles.productoTipo}>
                  {item.tipo === "reactivo"
                    ? "Reactivo"
                    : item.tipo === "material"
                    ? "Material"
                    : "Equipo"}
                </ThemedText>
                <View style={styles.separator} />

                <ThemedText style={styles.lotesCount}>
                  {item.lotes.length}{" "}
                  {item.lotes.length === 1 ? "lote" : "lotes"}
                </ThemedText>
              </View>
            </View>

            <View style={styles.productoActions}>
              <View
                style={[styles.stockBadge, { backgroundColor: color + "15" }]}
              >
                <ThemedText style={[styles.stockText, { color }]}>
                  {item.stockActual} unidades
                </ThemedText>
              </View>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#64748B"
              />
            </View>
          </TouchableOpacity>

          {/* Detalles expandidos */}
          {isExpanded && (
            <View style={styles.lotesContainer}>
              {/* Header específico por tipo */}
              <View style={styles.tableHeader}>
                {item.tipo === "reactivo" && (
                  <>
                    {/* Columnas Reactivo */}
                    <ThemedText style={styles.tableHeaderText}>Lote</ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      Consumido
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      Stock
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      F. Ingreso
                    </ThemedText>
                  </>
                )}

                {item.tipo === "material" && (
                  <>
                    {/* Columnas Material */}
                    <ThemedText style={styles.tableHeaderText}>Lote</ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      Marca
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      Stock
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      F. Ingreso
                    </ThemedText>
                  </>
                )}

                {item.tipo === "equipo" && (
                  <>
                    {/* Columnas Equipo */}
                    <ThemedText style={styles.tableHeaderText}>
                      Marca/Modelo
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      ID AGK
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      No. Serie
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      Estatus
                    </ThemedText>
                    <ThemedText style={styles.tableHeaderText}>
                      F. Ingreso
                    </ThemedText>
                  </>
                )}
              </View>

              {item.lotes.map((lote) => (
                <View key={lote.id} style={styles.loteRow}>
                  {item.tipo === "reactivo" && (
                    <>
                      {/* Datos Reactivo */}
                      <ThemedText style={styles.loteText}>
                        {lote.lote}
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.cantidadConsumida || 0}u
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.stockActual}u
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.fechaIngreso}
                      </ThemedText>
                    </>
                  )}

                  {item.tipo === "material" && (
                    <>
                      {/* Datos Material */}
                      <ThemedText style={styles.loteText}>
                        {lote.lote}
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.marca}
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.stockActual}u
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.fechaIngreso}
                      </ThemedText>
                    </>
                  )}

                  {item.tipo === "equipo" && (
                    <>
                    {/* Datos Equipo */}
                      <ThemedText style={styles.loteText}>
                        {lote.marca} / {lote.modelo}
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.idAgk}
                      </ThemedText>
                      <ThemedText style={styles.loteText}>
                        {lote.numeroSerie}
                      </ThemedText>
                      <View
                        style={[
                          styles.estadoBadge,
                          {
                            backgroundColor:
                              lote.estatus === "activo"
                                ? "#10B98115"
                                : "#6B728015",
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
                      <ThemedText style={styles.loteText}>
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
    },
    [
      productosExpandidos,
      getEstadoStock,
      getColorCaducidad,
      toggleProductoExpandido,
    ]
  );
  if (loading) {
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

  return (
    <View style={styles.container}>
      {/* 🔹 Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={styles.headerTitle}>
            Reportes
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFiltrosVisible(true)}
            >
              <Ionicons name="options-outline" size={20} color="#1E293B" />
              <ThemedText style={styles.filterText}>Filtrar Periodo</ThemedText>
              <Ionicons name="chevron-down" size={16} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🔹 Periodo actual */}
        <View style={styles.periodoContainer}>
          <ThemedText style={styles.periodoText}>
            Periodo: Ene 2025 - Abr 2025
          </ThemedText>
        </View>

        {/* 🔹 Botones de exportar */}
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportButtonBig}
            onPress={exportarPDF}
          >
            <Ionicons name="document-text-outline" size={20} color="#D9534F" />
            <ThemedText style={styles.exportButtonText}>PDF</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButtonBig}
            onPress={exportarExcel}
          >
            <Ionicons name="stats-chart-outline" size={20} color="#5CB85C" />
            <ThemedText style={styles.exportButtonText}>Excel</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔹 Filtros por tipo de producto */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[
            styles.filtroCard,
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
            filtros.tipoProducto === "reactivo" && styles.filtroCardActive,
          ]}
          onPress={() =>
            setFiltros((prev) => ({ ...prev, tipoProducto: "reactivo" }))
          }
        >
          <Ionicons
            name="flask-outline"
            size={24}
            color={filtros.tipoProducto === "reactivo" ? "#FFFFFF" : "#8B5CF6"}
          />
          <ThemedText
            style={[
              styles.filtroNumber,
              filtros.tipoProducto === "reactivo" && styles.filtroNumberActive,
            ]}
          >
            {contadores.reactivo}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              filtros.tipoProducto === "reactivo" && styles.filtroLabelActive,
            ]}
          >
            Reactivos
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroCard,
            filtros.tipoProducto === "material" && styles.filtroCardActive,
          ]}
          onPress={() =>
            setFiltros((prev) => ({ ...prev, tipoProducto: "material" }))
          }
        >
          <Ionicons
            name="cube-outline"
            size={24}
            color={filtros.tipoProducto === "material" ? "#FFFFFF" : "#10B981"}
          />
          <ThemedText
            style={[
              styles.filtroNumber,
              filtros.tipoProducto === "material" && styles.filtroNumberActive,
            ]}
          >
            {contadores.material}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              filtros.tipoProducto === "material" && styles.filtroLabelActive,
            ]}
          >
            Materiales
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroCard,
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
              filtros.tipoProducto === "equipo" && styles.filtroNumberActive,
            ]}
          >
            {contadores.equipo}
          </ThemedText>
          <ThemedText
            style={[
              styles.filtroLabel,
              filtros.tipoProducto === "equipo" && styles.filtroLabelActive,
            ]}
          >
            Equipos
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 🔹 Contenido de Reportes */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 🔹 Lista de productos */}
        <View style={styles.productosList}>
          <FlatList
            data={productosFiltrados}
            keyExtractor={(item) => item.id}
            renderItem={renderProductoItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* 🔹 Modal de Filtros de Periodo */}
      <Modal visible={filtrosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Periodo del Reporte
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFiltrosVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* MODIFICACIÓN 1: Opciones de periodo eliminadas */}
            <View style={styles.periodoOptions}>
              <ThemedText style={styles.placeholderText}>
                Aquí irá el selector de rango de fechas (ej. "Desde" y "Hasta").
              </ThemedText>
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
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
  filterText: {
    fontSize: 12,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  exportButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  exportButtonBig: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    height: 40,
    flex: 1,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  filtrosContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filtroCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  filtroCardActive: {
    backgroundColor: "#4B9CD3",
    shadowColor: "#4B9CD3",
    shadowOpacity: 0.2,
    elevation: 4,
  },
  filtroNumber: {
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Poppins_700Bold",
  },
  filtroNumberActive: {
    color: "#FFFFFF",
  },
  filtroLabel: {
    fontSize: 10,
    color: "#64748B",
    fontFamily: "Poppins_500Medium",
    textAlign: "center",
  },
  filtroLabelActive: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  productosList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  productoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  productoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  productoInfo: {
    flex: 1,
    gap: 4,
  },
  productoNombre: {
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Poppins_600SemiBold",
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
    fontFamily: "Poppins_600SemiBold",
  },
  lotesContainer: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 8,
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
  loteText: {
    fontSize: 10,
    color: "#475569",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    flex: 1,
  },
  diasBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "center",
  },
  diasText: {
    fontSize: 8,
    fontFamily: "Poppins_600SemiBold",
  },
  estadoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "center",
  },
  estadoText: {
    fontSize: 8,
    fontFamily: "Poppins_600SemiBold",
  },
  spacer: {
    height: 20,
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
    paddingBottom: 34,
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
  periodoOptions: {
    padding: 20,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 150,
  },
  placeholderText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    padding: 20,
  },
  filterActions: {
    paddingHorizontal: 20,
  },
  applyBtn: {
    backgroundColor: "#4B9CD3",
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#4B9CD3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});
