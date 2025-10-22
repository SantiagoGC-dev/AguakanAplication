import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  RefreshControl,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";

// Configuración de API
const API_BASE_URL = "http://172.20.10.11:3000/api";

interface Movimiento {
  id_movimiento: string;
  producto: string;
  id_producto: string;
  usuario: string;
  nombre_tipo: string;
  nombre_motivo?: string;
  descripcion_adicional?: string;
  cantidad: number;
  fecha: string;
}

interface Filtros {
  periodo: string;
  tipoAccion: string;
}

// Opciones para el periodo
const periodoOptions = [
  { value: "todos", label: "Todos" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mes" },
  { value: "trimestre", label: "Este trimestre" },
  { value: "año", label: "Este año" },
];

export default function BitacoraScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [movimientosFiltrados, setMovimientosFiltrados] = useState<
    Movimiento[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    periodo: "todos",
    tipoAccion: "",
  });

  // 🔹 Función para fetch de datos
  const fetchData = async (endpoint: string) => {
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
  };

  // 🔹 Cargar movimientos desde el backend
  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      console.log("🔄 Cargando historial de actividades...");

      const movimientosData = await fetchData("/movimientos");

      console.log("✅ Movimientos cargados:", movimientosData);

      setMovimientos(movimientosData);
      setMovimientosFiltrados(movimientosData);
    } catch (error) {
      console.error("❌ Error cargando movimientos:", error);
      Alert.alert("Error", "No se pudieron cargar las actividades");

      // Datos de ejemplo como fallback
      const datosEjemplo: Movimiento[] = [
        {
          id_movimiento: "1",
          id_producto: "1",
          producto: "Guantes de látex estéril talla M",
          usuario: "Santiago Gutierrez",
          nombre_tipo: "Entrada",
          cantidad: 115,
          fecha: "2024-01-15T16:29:00Z",
        },
        {
          id_movimiento: "2",
          id_producto: "2",
          producto: "Agua destilada",
          usuario: "Pedro Ramirez",
          nombre_tipo: "Salida",
          nombre_motivo: "Baja",
          descripcion_adicional: "Producto agotado",
          cantidad: 0,
          fecha: "2024-01-15T16:29:00Z",
        },
        {
          id_movimiento: "3",
          id_producto: "3",
          producto: "Fosfato de potasio dibásico",
          usuario: "Miriam Lopez",
          nombre_tipo: "Salida",
          nombre_motivo: "Iniciar uso",
          descripcion_adicional: "Inicio de uso en experimento",
          cantidad: 1,
          fecha: "2024-01-15T16:29:00Z",
        },
        {
          id_movimiento: "4",
          id_producto: "4",
          producto: "Nitrito de sodio",
          usuario: "David Garcia",
          nombre_tipo: "Salida",
          nombre_motivo: "Finalizar uso",
          descripcion_adicional: "Duración: 6 días 23h",
          cantidad: 1,
          fecha: "2024-01-15T16:29:00Z",
        },
      ];

      setMovimientos(datosEjemplo);
      setMovimientosFiltrados(datosEjemplo);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🔹 Generar descripción legible desde los datos reales
  const obtenerAccion = (mov: Movimiento): string => {
    const { nombre_motivo, nombre_tipo, cantidad } = mov;

    if (nombre_motivo === "Iniciar uso") {
      return "inició uso de";
    } else if (nombre_motivo === "Finalizar uso") {
      return "finalizó uso de";
    } else if (nombre_tipo === "Entrada" && cantidad) {
      return `registró ${cantidad} unidades de`;
    } else if (nombre_motivo === "Baja") {
      return "dio de baja";
    } else if (nombre_motivo === "Incidencia") {
      return "reportó incidencia en";
    } else {
      return `${nombre_tipo?.toLowerCase() || "movimiento"} de`;
    }
  };

  // 🔹 Obtener fecha límite según el periodo seleccionado
  const getFechaLimite = (periodo: string): Date => {
    const ahora = new Date();
    switch (periodo) {
      case "semana":
        return new Date(
          ahora.getFullYear(),
          ahora.getMonth(),
          ahora.getDate() - 7
        );
      case "mes":
        return new Date(
          ahora.getFullYear(),
          ahora.getMonth() - 1,
          ahora.getDate()
        );
      case "trimestre":
        return new Date(
          ahora.getFullYear(),
          ahora.getMonth() - 3,
          ahora.getDate()
        );
      case "año":
        return new Date(
          ahora.getFullYear() - 1,
          ahora.getMonth(),
          ahora.getDate()
        );
      default:
        return new Date(0); // Fecha muy antigua para "todos"
    }
  };

  // 🔹 Aplicar filtros
  const aplicarFiltros = () => {
    let filtered = [...movimientos];

    // Filtro de búsqueda (producto)
    if (busqueda.trim()) {
      filtered = filtered.filter((mov) =>
        mov.producto.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtro por periodo
    if (filtros.periodo !== "todos") {
      const fechaLimite = getFechaLimite(filtros.periodo);
      filtered = filtered.filter((mov) => {
        try {
          const fechaMov = new Date(mov.fecha);
          return fechaMov >= fechaLimite;
        } catch (error) {
          return true;
        }
      });
    }

    // Filtro por tipo de acción (Entrada o Motivos de Baja)
    if (filtros.tipoAccion) {
      if (filtros.tipoAccion === "Entrada") {
        filtered = filtered.filter((mov) => mov.nombre_tipo === "Entrada");
      } else {
        filtered = filtered.filter(
          (mov) => mov.nombre_motivo === filtros.tipoAccion
        );
      }
    }

    setMovimientosFiltrados(filtered);
    setFiltrosVisible(false);
  };

  // 🔹 Resetear filtros
  const resetearFiltros = () => {
    setFiltros({
      periodo: "todos",
      tipoAccion: "",
    });
    setBusqueda("");
    setMovimientosFiltrados(movimientos);
    setFiltrosVisible(false);
  };

  // 🔹 Formatear fecha
  const formatFecha = (fechaString: string) => {
    try {
      const fecha = new Date(fechaString);
      return (
        fecha.toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) +
        " - " +
        fecha.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        }) +
        "h"
      );
    } catch (error) {
      return fechaString;
    }
  };

  // 🔹 Obtener icono y color según tipo de movimiento
  const getIcono = (mov: Movimiento) => {
    const { nombre_tipo, nombre_motivo } = mov;

    if (nombre_motivo === "Iniciar uso") {
      return { icon: "play-outline", color: "#3B82F6" };
    } else if (nombre_motivo === "Finalizar uso") {
      return { icon: "stop-outline", color: "#DC2626" };
    } else if (nombre_motivo === "Incidencia") {
      return { icon: "warning-outline", color: "#F59E0B" };
    } else if (nombre_motivo === "Baja") {
      return { icon: "trending-down-outline", color: "#EF4444" };
    } else if (nombre_tipo === "Entrada") {
      return { icon: "archive-outline", color: "#16A34A" };
    } else {
      return { icon: "information-circle-outline", color: "#CBD5E1" };
    }
  };

  // 🔹 Cargar datos al montar
  useEffect(() => {
    fetchMovimientos();
  }, []);

  // 🔹 Efecto para búsqueda en tiempo real
  useEffect(() => {
    if (
      busqueda.trim() === "" &&
      filtros.periodo === "todos" &&
      !filtros.tipoAccion
    ) {
      setMovimientosFiltrados(movimientos);
    } else {
      aplicarFiltros();
    }
  }, [busqueda, movimientos, filtros]);

  // 🔹 Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMovimientos();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="shuffle" size={48} color="#4B9CD3" />
          <ThemedText type="title" style={styles.loadingText}>
            Cargando historial de movimientos...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 🔹 Header */}
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Bitácora de Movimientos
        </ThemedText>
        <View style={{ width: 26 }} />
      </View>

      {/* 🔹 Buscador y filtros */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            placeholder="Buscar producto"
            value={busqueda}
            onChangeText={setBusqueda}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFiltrosVisible(true)}
        >
          <Ionicons name="filter-outline" size={18} color="#1E293B" />
          <ThemedText style={styles.filterText}>Filtros</ThemedText>
        </TouchableOpacity>
      </View>

      {/* 🔹 Lista de actividades */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {movimientosFiltrados.length > 0 ? (
          movimientosFiltrados.map((mov) => {
            const { icon, color } = getIcono(mov);
            const accion = obtenerAccion(mov);

            return (
              <TouchableOpacity
                key={mov.id_movimiento}
                style={styles.item}
                onPress={() => {
                  if (mov.id_producto) {
                    router.push(`/detail/${mov.id_producto}`);
                  }
                }}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: color + "15" },
                  ]}
                >
                  <Ionicons name={icon as any} size={20} color={color} />
                </View>
                <View style={styles.itemInfo}>
                  <ThemedText style={styles.descripcionCompleta}>
                    <ThemedText type="defaultSemiBold" style={styles.usuario}>
                      {mov.usuario}
                    </ThemedText>{" "}
                    <ThemedText style={styles.accion}>
                      {obtenerAccion(mov)}
                    </ThemedText>{" "}
                    <ThemedText
                      type="defaultSemiBold"
                      style={styles.productoNombre}
                    >
                      {mov.producto}
                    </ThemedText>
                  </ThemedText>
                  {mov.descripcion_adicional && (
                    <ThemedText style={styles.detalleAdicional}>
                      {mov.descripcion_adicional}
                    </ThemedText>
                  )}
                  <ThemedText style={styles.fecha}>
                    {formatFecha(mov.fecha)}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={48} color="#CBD5E1" />
            <ThemedText style={styles.emptyStateText}>
              {busqueda || filtros.periodo !== "todos" || filtros.tipoAccion
                ? "No se encontraron resultados"
                : "No hay actividades registradas"}
            </ThemedText>
            {(busqueda ||
              filtros.periodo !== "todos" ||
              filtros.tipoAccion) && (
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetearFiltros}
              >
                <ThemedText style={styles.resetButtonText}>
                  Resetear filtros
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* 🔹 Modal de Filtros */}
      <Modal visible={filtrosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>
                Filtros
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
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.filterCardTitle}
                >
                  Selección de periodo
                </ThemedText>
                <View style={styles.filterOptions}>
                  {periodoOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        filtros.periodo === option.value &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setFiltros((prev) => ({
                          ...prev,
                          periodo: option.value,
                        }))
                      }
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          filtros.periodo === option.value &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filtro: Tipo de Acción */}
              <View style={styles.filterCard}>
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.filterCardTitle}
                >
                  Tipo de Acción
                </ThemedText>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      filtros.tipoAccion === "" && styles.filterOptionActive,
                    ]}
                    onPress={() =>
                      setFiltros((prev) => ({
                        ...prev,
                        tipoAccion: "",
                      }))
                    }
                  >
                    <ThemedText
                      style={[
                        styles.filterOptionText,
                        filtros.tipoAccion === "" &&
                          styles.filterOptionTextActive,
                      ]}
                    >
                      Todos
                    </ThemedText>
                  </TouchableOpacity>
                  {[
                    "Entrada",
                    "Iniciar uso",
                    "Finalizar uso",
                    "Incidencia",
                    "Baja",
                  ].map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.filterOption,
                        filtros.tipoAccion === tipo &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() =>
                        setFiltros((prev) => ({
                          ...prev,
                          tipoAccion: prev.tipoAccion === tipo ? "" : tipo,
                        }))
                      }
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          filtros.tipoAccion === tipo &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {tipo}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={resetearFiltros}
              >
                <ThemedText style={styles.resetBtnText}>
                  Limpiar Filtros
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={aplicarFiltros}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 6,
    fontFamily: "Poppins_400Regular",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  scrollContent: { paddingBottom: 100, gap: 12 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  itemInfo: {
    flex: 1,
  },
  descripcionCompleta: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    fontFamily: "Poppins_400Regular",
  },
  usuario: {
    color: "#000000ff",
    fontFamily: "Poppins_500Medium",
  },
  accion: {
    color: "#475569",
    fontFamily: "Poppins_400Regular",
  },
  productoNombre: {
    color: "#000000ff",
    fontFamily: "Poppins_500Medium",
  },
  detalleAdicional: {
    fontSize: 12,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 2,
    fontFamily: "Poppins_400Regular",
  },
  fecha: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    fontFamily: "Poppins_400Regular",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#4B9CD3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins_600Bold",
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
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  filtersScroll: {
    padding: 20,
  },
  filterCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  filterCardTitle: {
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  filterOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Poppins_500Medium",
  },
  filterOptionTextActive: {
    color: "#FFFFFF",
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
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  applyBtn: {
    flex: 2,
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  resetBtnText: {
    color: "#374151",
    fontSize: 16,
    fontFamily: "Poppins_600Bold",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins_600Bold",
  },
});
