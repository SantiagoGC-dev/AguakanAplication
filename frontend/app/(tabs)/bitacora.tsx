import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
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
import api from "@/utils/api";
import { useColorScheme } from "@/hooks/use-color-scheme";

// Interfaces
interface Usuario {
  id_usuario: string;
  nombre_completo: string;
  rol: string;
}
interface Filtros {
  periodo: string;
  tipoAccion: string;
  usuario: string;
}
interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}
interface ApiResponse {
  movimientos: Movimiento[];
  pagination: PaginationInfo;
}
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

export default function BitacoraScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [busqueda, setBusqueda] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [filtrosVisible, setFiltrosVisible] = useState(false);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [allMovimientos, setAllMovimientos] = useState<Movimiento[]>([]);
  const [dropdownUsuarioVisible, setDropdownUsuarioVisible] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
  });
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    periodo: "todos",
    tipoAccion: "",
    usuario: "todos",
  });

  // Funciones de Carga
  const fetchUsuarios = useCallback(async () => {
    try {
      const response = await api.get<Usuario[]>("/movimientos/usuarios");
      const usuariosData = response.data;
      console.log("✅ Usuarios cargados:", usuariosData.length);
      setUsuarios(usuariosData);
    } catch (error: any) {
      console.error(
        "❌ Error cargando usuarios:",
        error.response?.data || error.message
      );
      const usuariosRespaldo: Usuario[] = [
        {
          id_usuario: "1",
          nombre_completo: "Santiago Gutierrez Calderón",
          rol: "Administrador",
        },
        {
          id_usuario: "2",
          nombre_completo: "Pedro Ramirez Lopez",
          rol: "Laboratorista",
        },
        {
          id_usuario: "3",
          nombre_completo: "Miriam Lopez Garcia",
          rol: "Laboratorista",
        },
        {
          id_usuario: "4",
          nombre_completo: "David Garcia Martinez",
          rol: "Administrador",
        },
      ];
      setUsuarios(usuariosRespaldo);
    }
  }, []);

  const fetchMovimientos = useCallback(
    async (page: number = 1, isAppend: boolean = false) => {
      try {
        if (page === 1 && !isAppend) {
          setLoading(true);
        }
        console.log(`🔄 Cargando página ${page}...`);

        const response = await api.get<ApiResponse>("/movimientos", {
          params: {
            page: page,
            limit: "50",
            search: busqueda,
            periodo: filtros.periodo,
            tipoAccion: filtros.tipoAccion,
            usuario: filtros.usuario,
          },
        });

        const responseData = response.data;

        if (isAppend) {
          setAllMovimientos((prev) => [...prev, ...responseData.movimientos]);
        } else {
          setAllMovimientos(responseData.movimientos);
        }

        setPagination(responseData.pagination);
        setHasMore(page < responseData.pagination.totalPages);

        console.log(
          `✅ Página ${page} cargada:`,
          responseData.movimientos.length,
          "movimientos"
        );
      } catch (error: any) {
        console.error(
          "❌ Error cargando movimientos:",
          error.response?.data || error.message
        );
        Alert.alert("Error", "No se pudieron cargar las actividades");
        if (!isAppend) {
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
          ];
          setAllMovimientos(datosEjemplo);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [busqueda, filtros]
  );

  // Resto de funciones
  const loadMoreData = useCallback(() => {
    if (!loading && hasMore && allMovimientos.length > 0) {
      console.log(`📥 Cargando página ${pagination.currentPage + 1}...`);
      fetchMovimientos(pagination.currentPage + 1, true);
    }
  }, [
    loading,
    hasMore,
    pagination.currentPage,
    fetchMovimientos,
    allMovimientos.length,
  ]);

  const movimientosFiltrados = useMemo(() => {
    return allMovimientos;
  }, [allMovimientos]);

  useEffect(() => {
    const hayFiltrosActivos =
      filtros.periodo !== "todos" ||
      filtros.tipoAccion !== "" ||
      filtros.usuario !== "todos" ||
      busqueda.trim() !== "";
    setFiltrosAplicados(hayFiltrosActivos);
  }, [filtros, busqueda]);

  const resetearFiltros = useCallback(() => {
    setFiltros({
      periodo: "todos",
      tipoAccion: "",
      usuario: "todos",
    });
    setBusqueda("");
    setFiltrosAplicados(false);
  }, []);

  const aplicarFiltrosDesdeModal = useCallback(() => {
    setFiltrosVisible(false);
    fetchMovimientos(1, false);
  }, [fetchMovimientos]);

  const obtenerAccion = useCallback((mov: Movimiento): string => {
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
  }, []);

  const formatFecha = useCallback((fechaString: string) => {
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
  }, []);

  const getIcono = useCallback((mov: Movimiento) => {
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
  }, []);

  // Efectos
  useEffect(() => {
    fetchMovimientos(1, false);
    fetchUsuarios();
  }, [fetchUsuarios]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMovimientos(1, false);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [busqueda, filtros, fetchMovimientos]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setAllMovimientos([]);
    fetchMovimientos(1, false);
  }, [fetchMovimientos]);

  // --- Renderizado ---
  if (loading && allMovimientos.length === 0) {
    return (
      <View
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
      >
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
    <View style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, isDark && styles.headerDark]}>
        <Text style={[styles.headerTitle, isDark && styles.textDark]}>
          Bitácora de Movimientos
        </Text>
      </View>

      {/* Badge de filtros activos */}
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

      {/* Buscador y filtros */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, isDark && styles.searchBoxDark]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? "#888" : "#94A3B8"}
          />
          <TextInput
            placeholder="Buscar producto"
            value={busqueda}
            onChangeText={setBusqueda}
            style={[styles.searchInput, isDark && styles.textDark]}
            placeholderTextColor={isDark ? "#666" : "#94A3B8"}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            isDark && styles.filterButtonDark,
            filtrosAplicados && styles.filterButtonActive,
          ]}
          onPress={() => setFiltrosVisible(true)}
        >
          <Ionicons
            name="filter-outline"
            size={18}
            color={filtrosAplicados ? "#fff" : isDark ? "#fff" : "#1E293B"}
          />
          <ThemedText
            style={[
              styles.filterText,
              isDark && styles.textDark,
              filtrosAplicados && styles.filterTextActive,
            ]}
          >
            Filtros
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Lista de actividades CON PAGINACIÓN */}
      <FlatList
        data={movimientosFiltrados}
        keyExtractor={(item) => item.id_movimiento}
        renderItem={({ item }) => {
          const { icon, color } = getIcono(item);
          const accion = obtenerAccion(item);

          return (
            <TouchableOpacity
              style={[styles.item, isDark && styles.itemDark]}
              onPress={() => {
                if (item.id_producto) {
                  router.push(`/detail/${item.id_producto}`);
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
                <Text
                  style={[
                    styles.descripcionCompleta,
                    isDark && styles.textMutedDark,
                  ]}
                >
                  <Text style={[styles.usuario, isDark && styles.textDark]}>
                    {item.usuario}
                  </Text>

                  <Text style={[styles.accion, isDark && styles.textMutedDark]}>
                    {" "}
                    {accion}{" "}
                  </Text>

                  <Text
                    style={[styles.productoNombre, isDark && styles.textDark]}
                  >
                    {item.producto}
                  </Text>
                </Text>
                {item.descripcion_adicional && (
                  <Text
                    style={[
                      styles.detalleAdicional,
                      isDark && styles.textMutedDark,
                    ]}
                  >
                    {item.descripcion_adicional}
                  </Text>
                )}
                <Text style={[styles.fecha, isDark && styles.textMutedDark]}>
                  {formatFecha(item.fecha)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        onEndReached={loadMoreData}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? "#fff" : "#000"}
          />
        }
        ListFooterComponent={
          loading && allMovimientos.length > 0 ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#4B9CD3" />
              <ThemedText
                style={[
                  styles.loadingFooterText,
                  isDark && styles.textMutedDark,
                ]}
              >
                Cargando más...
              </ThemedText>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="list-outline"
                size={48}
                color={isDark ? "#444" : "#CBD5E1"}
              />
              <ThemedText
                style={[styles.emptyStateText, isDark && styles.textMutedDark]}
              >
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
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={isDark && styles.flatListDark}
      />

      {/* Modal de Filtros */}
      <Modal visible={filtrosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, isDark && styles.modalContentDark]}
          >
            <View
              style={[styles.modalHeader, isDark && styles.modalHeaderDark]}
            >
              <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                Filtros
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFiltrosVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#fff" : "#666"}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filtersScroll}>
              {/* Filtro: Periodo */}
              <View
                style={[styles.filterCard, isDark && styles.filterCardDark]}
              >
                <Text
                  style={[styles.filterCardTitle, isDark && styles.textDark]}
                >
                  Selección de periodo
                </Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: "todos", label: "Todos" },
                    { value: "hoy", label: "Hoy" },
                    { value: "7dias", label: "Últimos 7 días" },
                    { value: "este_mes", label: "Este mes" },
                    { value: "mes_pasado", label: "Mes pasado" },
                    { value: "este_año", label: "Este año" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterOption,
                        isDark && styles.filterOptionDark,
                        filtros.periodo === option.value &&
                          styles.filterOptionActive,
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
                          isDark && styles.filterOptionTextDark,
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
              <View
                style={[styles.filterCard, isDark && styles.filterCardDark]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.filterCardTitle, isDark && styles.textDark]}
                >
                  Tipo de Acción
                </ThemedText>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      isDark && styles.filterOptionDark,
                      filtros.tipoAccion === "" && styles.filterOptionActive,
                    ]}
                    onPress={() => {
                      setFiltros((prev) => ({
                        ...prev,
                        tipoAccion: "",
                      }));
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.filterOptionText,
                        isDark && styles.filterOptionTextDark,
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
                        isDark && styles.filterOptionDark,
                        filtros.tipoAccion === tipo &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => {
                        setFiltros((prev) => ({
                          ...prev,
                          tipoAccion: prev.tipoAccion === tipo ? "" : tipo,
                        }));
                      }}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          isDark && styles.filterOptionTextDark,
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

              {/* Filtro: Usuario */}
              <View
                style={[styles.filterCard, isDark && styles.filterCardDark]}
              >
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.filterCardTitle, isDark && styles.textDark]}
                >
                  Usuario
                </ThemedText>
                <TouchableOpacity
                  style={[
                    styles.dropdownTrigger,
                    isDark && styles.dropdownTriggerDark,
                  ]}
                  onPress={() =>
                    setDropdownUsuarioVisible(!dropdownUsuarioVisible)
                  }
                >
                  <ThemedText
                    style={[
                      styles.dropdownTriggerText,
                      isDark && styles.textDark,
                    ]}
                  >
                    {filtros.usuario === "todos"
                      ? "Todos los usuarios"
                      : usuarios.find((u) => u.id_usuario === filtros.usuario)
                          ?.nombre_completo || "Seleccionar usuario"}
                  </ThemedText>
                  <Ionicons
                    name={
                      dropdownUsuarioVisible ? "chevron-up" : "chevron-down"
                    }
                    size={20}
                    color={isDark ? "#888" : "#666"}
                  />
                </TouchableOpacity>

                {dropdownUsuarioVisible && (
                  <View
                    style={[
                      styles.dropdownContent,
                      isDark && styles.dropdownContentDark,
                    ]}
                  >
                    <ScrollView
                      style={styles.dropdownScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      <TouchableOpacity
                        style={[
                          styles.dropdownOption,
                          isDark && styles.dropdownOptionDark,
                          filtros.usuario === "todos" &&
                            styles.dropdownOptionActive,
                        ]}
                        onPress={() => {
                          setFiltros((prev) => ({
                            ...prev,
                            usuario: "todos",
                          }));
                          setDropdownUsuarioVisible(false);
                        }}
                      >
                        <ThemedText
                          style={[
                            styles.dropdownOptionText,
                            isDark && styles.dropdownOptionTextDark,
                            filtros.usuario === "todos" &&
                              styles.dropdownOptionTextActive,
                          ]}
                        >
                          Todos los usuarios
                        </ThemedText>
                        {filtros.usuario === "todos" && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color="#539DF3"
                          />
                        )}
                      </TouchableOpacity>

                      {usuarios.map((usuario) => (
                        <TouchableOpacity
                          key={usuario.id_usuario}
                          style={[
                            styles.dropdownOption,
                            isDark && styles.dropdownOptionDark,
                            filtros.usuario === usuario.id_usuario &&
                              styles.dropdownOptionActive,
                          ]}
                          onPress={() => {
                            setFiltros((prev) => ({
                              ...prev,
                              usuario: usuario.id_usuario,
                            }));
                            setDropdownUsuarioVisible(false);
                          }}
                        >
                          <ThemedText
                            style={[
                              styles.dropdownOptionText,
                              isDark && styles.dropdownOptionTextDark,
                              filtros.usuario === usuario.id_usuario &&
                                styles.dropdownOptionTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {usuario.nombre_completo}
                          </ThemedText>
                          {filtros.usuario === usuario.id_usuario && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color="#539DF3"
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>

            <View
              style={[styles.filterActions, isDark && styles.filterActionsDark]}
            >
              <TouchableOpacity
                style={[styles.resetBtn, isDark && styles.resetBtnDark]}
                onPress={() => {
                  setFiltros({
                    periodo: "todos",
                    tipoAccion: "",
                    usuario: "todos",
                  });
                  setDropdownUsuarioVisible(false);
                }}
              >
                <ThemedText
                  style={[
                    styles.resetBtnText,
                    isDark && styles.resetBtnTextDark,
                  ]}
                >
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },
  containerDark: {
    backgroundColor: "#000",
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
    color: "#4B9CD3",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerDark: {
    backgroundColor: "#000",
  },
  headerTitle: {
    fontSize: 24,
    color: "#000000ff",
    fontFamily: "Poppins_700Bold",
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  searchBoxDark: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#333",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 6,
    marginBottom: -5,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  filterButtonDark: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#333",
  },
  filterButtonActive: {
    backgroundColor: "#539DF3",
  },
  filterText: {
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 100,
    gap: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemDark: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#333",
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
    fontSize: 16,
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
    color: "#55606fff",
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
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#539DF3",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
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
    maxHeight: "85%",
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
  filterCardDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
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
  filterOptionDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
  },
  filterOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterOptionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#666",
  },
  filterOptionTextDark: {
    color: "#888",
  },
  filterOptionTextActive: {
    color: "#fff",
  },
  filterActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  filterActionsDark: {
    borderTopColor: "#333",
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
  resetBtnDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
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
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
  },
  resetBtnTextDark: {
    color: "#888",
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  loadingFooter: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  loadingFooterText: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  dropdownTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 18,
    padding: 12,
    backgroundColor: "white",
    marginBottom: 8,
  },
  dropdownTriggerDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
  },
  dropdownTriggerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  dropdownContent: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "white",
    maxHeight: 200,
    marginBottom: 8,
  },
  dropdownContentDark: {
    backgroundColor: "#2c2c2e",
    borderColor: "#333",
  },
  dropdownScroll: {
    maxHeight: 198,
  },
  dropdownOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownOptionDark: {
    borderBottomColor: "#333",
  },
  dropdownOptionActive: {
    backgroundColor: "#EEF2FF",
  },
  dropdownOptionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#374151",
    flex: 1,
  },
  dropdownOptionTextDark: {
    color: "#fff",
  },
  dropdownOptionTextActive: {
    color: "#539DF3",
  },
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});
