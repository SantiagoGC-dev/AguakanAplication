import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/AuthContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface DashboardStats {
  totalProductos: number;
  productosBajoStock: number;
  productosEnUso: number;
  proximosCaducar: number;
}

interface ProductoEnUso {
  id: string;
  nombre: string;
  lote: string;
  fechaUso: string;
  responsable: string;
  imagen?: string;
  uniqueKey?: string;
}

interface Movimiento {
  id: string;
  producto: string;
  usuario: string;
  tipo_movimiento: string;
  motivo_baja?: string;
  fecha: string;
  descripcion_adicional?: string;
  uniqueKey?: string;
}

interface Alerta {
  id: string;
  tipo: "caducidad" | "stock";
  producto: string;
  lote: string;
  diasRestantes?: number;
  stockActual?: number;
  stockMinimo?: number;
  fechaCaducidad?: string;
  uniqueKey?: string;
}

interface Usuario {
  id_usuario: number;
  primer_nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  correo: string;
  id_rol: number;
  rol: number;
  id_laboratorio: number;
  laboratorio: string;
  ubicacion_laboratorio: string;
  estatus: string;
}

// Configuración de API
const API_BASE_URL = "http://10.149.121.216:3000/api";

// Darle formato a la fecha
function formatDate(dateString: string) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return dateString;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Estados
  const { user: authUser } = useAuth();
  const [userName, setUserName] = useState("Usuario");
  const [userRole, setUserRole] = useState("Laboratorista");
  const [showModal, setShowModal] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalProductos: 0,
    productosBajoStock: 0,
    productosEnUso: 0,
    proximosCaducar: 0,
  });

  const [productosEnUso, setProductosEnUso] = useState<ProductoEnUso[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [modalNotificacionesVisible, setModalNotificacionesVisible] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función helper para hacer peticiones fetch
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

  // Cargar datos del dashboard
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log("🔄 Cargando datos del dashboard...");

      const [statsData, productosData, movimientosData, alertasData] =
        await Promise.all([
          fetchData("/dashboard/stats"),
          fetchData("/dashboard/productos-en-uso"),
          fetchData("/dashboard/movimientos-recientes"),
          fetchData("/dashboard/alertas"),
        ]);

      console.log("✅ Datos cargados:", {
        stats: statsData,
        productos: productosData,
        movimientos: movimientosData,
        alertas: alertasData,
      });

      setStats(statsData);

      // Asegurar claves únicas
      const productosUnicos = productosData.map(
        (producto: ProductoEnUso, index: number) => ({
          ...producto,
          uniqueKey: `${producto.id}-${producto.fechaUso}-${index}`,
        })
      );
      setProductosEnUso(productosUnicos);

      const movimientosUnicos = movimientosData.map(
        (movimiento: Movimiento, index: number) => ({
          ...movimiento,
          uniqueKey: `${movimiento.id}-${movimiento.fecha}-${index}`,
        })
      );
      setMovimientos(movimientosUnicos);

      // Filtrar duplicados ANTES de agregar uniqueKey
      const alertasMap = new Map();
      alertasData.forEach((alerta: Alerta) => {
        // Usamos una clave compuesta de ID y Tipo para definir la unicidad
        const key = `${alerta.id}-${alerta.tipo}`;
        if (!alertasMap.has(key)) {
          alertasMap.set(key, alerta);
        }
      });

      // Convertir el Map de vuelta a un array y AHORA sí, agregar uniqueKey para React
      const alertasUnicas = Array.from(alertasMap.values()).map(
        (alerta: Alerta, index: number) => ({
          ...alerta,
          uniqueKey: `${alerta.id}-${alerta.tipo}-${index}`,
        })
      );

      setAlertas(alertasUnicas);
    } catch (error) {
      console.error("❌ Error cargando dashboard:", error);
      Alert.alert("Error", "No se pudieron cargar los datos del dashboard");

      setStats({
        totalProductos: 0,
        productosBajoStock: 0,
        productosEnUso: 0,
        proximosCaducar: 0,
      });
      setProductosEnUso([]);
      setMovimientos([]);
      setAlertas([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // CALCULAR ALERTAS CON useMemo PARA QUE SE ACTUALICEN AUTOMÁTICAMENTE
  const alertasCaducidad = React.useMemo(
    () => alertas.filter((a) => a.tipo === "caducidad"),
    [alertas] // Se recalcula cuando 'alertas' cambia
  );

  const alertasStock = React.useMemo(
    () => alertas.filter((a) => a.tipo === "stock"),
    [alertas] // Se recalcula cuando 'alertas' cambia
  );

  // Cargar datos al montar el componente
  useEffect(() => {
    // Usar el usuario del contexto
    if (authUser) {
      console.log("✅ Usuario cargado desde Contexto:", authUser.primer_nombre);
      setUserName(authUser.primer_nombre);
      const roleName = authUser.rol === 1 ? "Administrador" : "Laboratorista";
      setUserRole(roleName);
    } else {
      console.log("ℹ️ No hay usuario logueado en contexto");
      setUserName("Usuario");
      setUserRole("Laboratorista");
    }

    // Cargar los datos del dashboard
    fetchDashboardData();
  }, [authUser]); // 🔥 Ejecutar esto solo cuando 'authUser' cambie

  // Pull to refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  //  Función para manejar clic en notificación
  const handleNotificacionPress = () => {
    if (alertasCaducidad.length > 0 || alertasStock.length > 0) {
      setShowModal(true); // Primero actualiza el estado
      setTimeout(() => {
        setModalNotificacionesVisible(true); // Luego abre el modal
      }, 100);
    } else {
      Alert.alert(
        "Sin alertas",
        "No hay productos que requieran atención en este momento"
      );
    }
  };

  // Función para manejar "Ver todos" en movimientos
  const handleVerTodosMovimientos = () => {
    console.log("Navegar a historial de actividades");
    router.push("/(tabs)/bitacora");
  };

  // Función para manejar "Ver más" en productos en uso
  const handleVerMasProductos = () => {
    console.log("Navegar a productos en uso");
    // Usar query parameters en lugar de params
    router.push({
      pathname: "/(tabs)/inventario",
      params: {
        filter: "en-uso",
        timestamp: Date.now(), // FORZAR actualización
      },
    });
  };

  if (loading) {
    return (
      <View
        style={[styles.loadingContainer, isDark && styles.loadingContainerDark]}
      >
        <View style={styles.loadingContent}>
          <Ionicons name="flask" size={48} color="#4B9CD3" />
          <ThemedText
            type="title"
            style={[styles.loadingText, isDark && styles.textDark]}
          >
            Cargando dashboard...
          </ThemedText>
          <ThemedText
            style={[styles.loadingSubtext, isDark && styles.textMutedDark]}
          >
            Preparando tu información
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, isDark && styles.mainContainerDark]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#539DF3"]}
            tintColor={isDark ? "#fff" : "#539DF3"}
          />
        }
      >
        {/* Header Mejorado */}
        <View
          style={[styles.headerContainer, isDark && styles.headerContainerDark]}
        >
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <View style={styles.avatarContainer}>
                <ThemedText style={styles.avatarText}>
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </ThemedText>
              </View>
              <View>
                <View style={styles.welcomeContainer}>
                  <Text style={[styles.welcomeText, isDark && styles.textDark]}>
                    ¡Hola!{" "}
                  </Text>
                  <Text
                    style={[styles.userNameText, isDark && styles.textDark]}
                  >
                    {userName}
                  </Text>
                </View>
                <Text
                  style={[styles.subtitleText, isDark && styles.subtitleText]}
                >
                  {userRole}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNotificacionPress}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={isDark ? "#0A84FF" : "#539DF3"}
              />
              {(stats.productosBajoStock > 0 || stats.proximosCaducar > 0) && (
                <View style={styles.notificationBadge}>
                  <ThemedText style={styles.badgeText}>
                    {stats.productosBajoStock + stats.proximosCaducar}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tarjetas de resumen mejoradas */}
        <View style={styles.cardsContainer}>
          <SummaryCard
            icon="cube-outline"
            color="#7DD87D"
            title="Total Productos"
            value={stats.totalProductos}
            subtitle="En inventario"
            isDark={isDark}
          />
          <SummaryCard
            icon="alert-circle-outline"
            color="#EFB700"
            title="Bajo Stock"
            value={stats.productosBajoStock}
            subtitle="Revisar pronto"
            isDark={isDark}
          />
          <SummaryCard
            icon="flask-outline"
            color="#4B9CD3"
            title="En Uso"
            value={stats.productosEnUso}
            subtitle="Activos ahora"
            isDark={isDark}
          />
          <SummaryCard
            icon="timer-outline"
            color="#F87171"
            title="Por Caducar"
            value={stats.proximosCaducar}
            subtitle="Próximos 15 días"
            isDark={isDark}
          />
        </View>

        {/* SECCIÓN MEJORADA: Alertas con diseño más atractivo */}
        {(alertasCaducidad.length > 0 || alertasStock.length > 0) && (
          <View
            style={[styles.alertasSection, isDark && styles.alertasSectionDark]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="warning" size={20} color="#EF4444" />
                <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                  Alertas Importantes
                </Text>
              </View>
              <TouchableOpacity onPress={handleNotificacionPress}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {/* Alertas combinadas en scroll horizontal */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.alertasScroll}
            >
              {alertasCaducidad.slice(0, 3).map((alerta) => (
                <AlertaCard
                  key={alerta.uniqueKey}
                  alerta={alerta}
                  onPress={() => {}}
                  isDark={isDark}
                />
              ))}
              {alertasStock.slice(0, 3).map((alerta) => (
                <AlertaCard
                  key={alerta.uniqueKey}
                  alerta={alerta}
                  onPress={() => {}}
                  isDark={isDark}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sección de productos en uso */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="flask-outline" size={20} color="#4B9CD3" />
              <Text style={[styles.sectionTitle, isDark && styles.textDark]}>
                Productos en Uso
              </Text>
            </View>
            {productosEnUso.length > 0 && (
              <TouchableOpacity onPress={handleVerMasProductos}>
                <Text style={styles.seeAllText}>Ver más</Text>
              </TouchableOpacity>
            )}
          </View>
          {productosEnUso.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {productosEnUso.map((producto) => (
                <ActiveProductCard
                  key={producto.uniqueKey}
                  producto={producto}
                  onPress={() => router.push(`/detail/${producto.id}`)}
                  isDark={isDark}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyState, isDark && styles.emptyStateDark]}>
              <Ionicons
                name="flask-outline"
                size={40}
                color={isDark ? "#333" : "#CBD5E1"}
              />
              <ThemedText
                style={[styles.emptyStateText, isDark && styles.textMutedDark]}
              >
                No hay productos en uso actualmente
              </ThemedText>
            </View>
          )}
        </View>

        {/* Movimientos recientes mejorados */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="shuffle" size={20} color="#4B9CD3" />
              <ThemedText
                type="subtitle"
                style={[styles.sectionTitle, isDark && styles.textDark]}
              >
                Actividad Reciente
              </ThemedText>
            </View>
            {movimientos.length > 0 && (
              <TouchableOpacity onPress={handleVerTodosMovimientos}>
                <ThemedText style={styles.seeAllText}>Ver todos</ThemedText>
              </TouchableOpacity>
            )}
          </View>
          {movimientos.length > 0 ? (
            <View style={styles.movimientosContainer}>
              {movimientos.map((movimiento) => (
                <MovimientoItem
                  key={movimiento.uniqueKey}
                  movimiento={movimiento}
                  isDark={isDark}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, isDark && styles.emptyStateDark]}>
              <Ionicons
                name="shuffle"
                size={40}
                color={isDark ? "#333" : "#CBD5E1"}
              />
              <ThemedText
                style={[styles.emptyStateText, isDark && styles.textMutedDark]}
              >
                No hay movimientos recientes
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Notificaciones - MEJORADO */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalNotificacionesVisible && showModal}
        onRequestClose={() => setModalNotificacionesVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, isDark && styles.modalContentDark]}
          >
            <View
              style={[styles.modalHeader, isDark && styles.modalHeaderDark]}
            >
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalTitleContainer}>
                  <Text style={[styles.modalTitle, isDark && styles.textDark]}>
                    Productos que requieren atención
                  </Text>
                  <ThemedText
                    style={[
                      styles.modalSubtitle,
                      isDark && styles.textMutedDark,
                    ]}
                  >
                    Selecciona para ir a sus detalles!
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={() => setModalNotificacionesVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? "#fff" : "#666"}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalScrollContent}>
              {/* Productos próximos a caducar */}
              {alertasCaducidad.length > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <View
                      style={[
                        styles.modalIconContainer,
                        { backgroundColor: isDark ? "#2A1A1A" : "#FEF2F2" },
                      ]}
                    >
                      <Ionicons
                        name="timer-outline"
                        size={20}
                        color="#F87171"
                      />
                    </View>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.modalSectionTitle,
                        isDark && styles.textDark,
                      ]}
                    >
                      Próximos a Caducar ({alertasCaducidad.length})
                    </ThemedText>
                  </View>
                  {alertasCaducidad.map((alerta) => (
                    <TouchableOpacity
                      key={alerta.uniqueKey}
                      style={[
                        styles.notificationItem,
                        {
                          backgroundColor: isDark ? "#2A1A1A" : "#FEF2F2",
                          borderLeftColor: "#F87171",
                        },
                        isDark && styles.notificationItemDark,
                      ]}
                      onPress={() => {
                        setModalNotificacionesVisible(false);
                        router.push(`/detail/${alerta.id}`);
                      }}
                    >
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.notificationProduct,
                          isDark && styles.textDark,
                        ]}
                      >
                        {alerta.producto}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.notificationText,
                          isDark && styles.textMutedDark,
                        ]}
                      >
                        Lote: {alerta.lote} • {alerta.diasRestantes} días
                        restantes
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.notificationSubtext,
                          isDark && styles.textMutedDark,
                        ]}
                      >
                        Caduca: {formatDate(alerta.fechaCaducidad || "")}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Productos con bajo stock */}
              {alertasStock.length > 0 && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <View
                      style={[
                        styles.modalIconContainer,
                        { backgroundColor: isDark ? "#2A2400" : "#FFFBEB" },
                      ]}
                    >
                      <Ionicons
                        name="alert-circle-outline"
                        size={20}
                        color="#EFB700"
                      />
                    </View>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.modalSectionTitle,
                        isDark && styles.textDark,
                      ]}
                    >
                      Bajo Stock ({alertasStock.length})
                    </ThemedText>
                  </View>
                  {alertasStock.map((alerta) => (
                    <TouchableOpacity
                      key={alerta.uniqueKey}
                      style={[
                        styles.notificationItem,
                        {
                          backgroundColor: isDark ? "#2A2400" : "#FFFBEB",
                          borderLeftColor: "#EFB700",
                        },
                        isDark && styles.notificationItemDark,
                      ]}
                      onPress={() => {
                        setModalNotificacionesVisible(false);
                        router.push(`/detail/${alerta.id}`);
                      }}
                    >
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.notificationProduct,
                          isDark && styles.textDark,
                        ]}
                      >
                        {alerta.producto}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.notificationText,
                          isDark && styles.textMutedDark,
                        ]}
                      >
                        Lote: {alerta.lote} • Stock: {alerta.stockActual}/
                        {alerta.stockMinimo}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.notificationSubtext,
                          isDark && styles.textMutedDark,
                        ]}
                      >
                        Stock crítico - Reabastecer pronto
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryCard({
  icon,
  color,
  title,
  value,
  subtitle,
  isDark,
}: {
  icon: any;
  color: string;
  title: string;
  value: number;
  subtitle?: string;
  isDark: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        isDark && styles.cardDark,
        { borderLeftColor: color },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: color + (isDark ? "30" : "20") },
          ]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
      </View>
      <ThemedText type="title" style={[styles.cardValue, { color }]}>
        {value}
      </ThemedText>
      <Text style={[styles.cardTitle, isDark && styles.textDark]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.cardSubtitle, isDark && styles.textMutedDark]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

function ActiveProductCard({
  producto,
  onPress,
  isDark,
}: {
  producto: ProductoEnUso;
  onPress: () => void;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.activeProductCard, isDark && styles.activeProductCardDark]}
      onPress={onPress}
    >
      {producto.imagen ? (
        <Image
          source={{ uri: producto.imagen }}
          style={styles.productImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.productIcon, isDark && styles.productIconDark]}>
          <MaterialCommunityIcons name="flask" size={24} color="#4B9CD3" />
        </View>
      )}
      <View style={styles.productInfo}>
        <ThemedText
          type="defaultSemiBold"
          numberOfLines={1}
          style={[styles.productName, isDark && styles.textDark]}
        >
          {producto.nombre}
        </ThemedText>
        <View style={styles.productDetail}>
          <Ionicons
            name="barcode-outline"
            size={14}
            color={isDark ? "#888" : "#666"}
          />
          <ThemedText
            style={[styles.productText, isDark && styles.textMutedDark]}
          >
            Lote: {producto.lote}
          </ThemedText>
        </View>
        <View style={styles.productDetail}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={isDark ? "#888" : "#666"}
          />
          <ThemedText
            style={[styles.productText, isDark && styles.textMutedDark]}
          >
            Inicio: {formatDate(producto.fechaUso)}
          </ThemedText>
        </View>
        <View style={styles.productDetail}>
          <Ionicons
            name="person-outline"
            size={14}
            color={isDark ? "#888" : "#666"}
          />
          <ThemedText
            style={[styles.productText, isDark && styles.textMutedDark]}
          >
            {producto.responsable}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* Componente: Movimiento reciente mejorado */
function MovimientoItem({
  movimiento,
  isDark,
}: {
  movimiento: Movimiento;
  isDark: boolean;
}) {
  const getIconConfig = (mov: Movimiento) => {
    // VERIFICAR PRIMERO EL MOTIVO_BAJA para movimientos de uso
    if (mov.motivo_baja === "Iniciar uso") {
      return { icon: "play-outline", color: "#3a82ed" };
    } else if (mov.motivo_baja === "Finalizar uso") {
      return { icon: "stop-outline", color: "#DC2626" };
    } else if (mov.motivo_baja === "Incidencia") {
      return { icon: "alert-outline", color: "#F59E0B" };
    } else if (mov.motivo_baja === "Baja") {
      return { icon: "trending-down-outline", color: "#ff2b2b" };
    } else if (mov.tipo_movimiento === "Entrada") {
      return { icon: "archive-outline", color: "#16A34A" };
    } else {
      return { icon: "exit-outline", color: "#6B7280" };
    }
  };

  const iconConfig = getIconConfig(movimiento);

  return (
    <View style={[styles.movItem, isDark && styles.movItemDark]}>
      <View
        style={[
          styles.movIconContainer,
          { backgroundColor: iconConfig.color + (isDark ? "30" : "20") },
        ]}
      >
        <Ionicons
          name={iconConfig.icon as any}
          size={20}
          color={iconConfig.color}
        />
      </View>
      <View style={styles.movInfo}>
        <ThemedText
          type="defaultSemiBold"
          style={[styles.movProduct, isDark && styles.textDark]}
        >
          {movimiento.producto}
        </ThemedText>
        <ThemedText style={[styles.movDetails, isDark && styles.textMutedDark]}>
          {movimiento.motivo_baja || movimiento.tipo_movimiento} ·{" "}
          {movimiento.usuario}
        </ThemedText>
        {movimiento.descripcion_adicional && (
          <ThemedText
            style={[styles.movMotivo, isDark && styles.movMotivoDark]}
          >
            {movimiento.descripcion_adicional}
          </ThemedText>
        )}
      </View>
      <ThemedText style={[styles.movDate, isDark && styles.textMutedDark]}>
        {formatDate(movimiento.fecha)}
      </ThemedText>
    </View>
  );
}

/* Componente: Tarjeta de Alerta SIN navegación */
function AlertaCard({
  alerta,
  onPress,
  isDark,
}: {
  alerta: Alerta;
  onPress: () => void;
  isDark: boolean;
}) {
  const alertaConfig = {
    caducidad: {
      icon: "timer-outline",
      color: "#DC2626",
      bgColor: isDark ? "#2A1A1A" : "#f7f7f7ff",
      text: "Caduca pronto",
      borderColor: "#FECACA",
    },
    stock: {
      icon: "alert-circle-outline",
      color: "#EFB700",
      bgColor: isDark ? "#2A2400" : "#f7f7f7ff",
      text: "Stock bajo",
      borderColor: "#FDE68A",
    },
  }[alerta.tipo];

  return (
    <View
      style={[
        styles.alertaCard,
        {
          backgroundColor: alertaConfig.bgColor,
          borderLeftColor: alertaConfig.color,
          borderLeftWidth: 4,
        },
        isDark && styles.alertaCardDark,
      ]}
    >
      <View style={styles.alertaHeader}>
        <View
          style={[
            styles.alertaIconContainer,
            { backgroundColor: alertaConfig.color },
          ]}
        >
          <Ionicons name={alertaConfig.icon as any} size={16} color="white" />
        </View>
        <ThemedText style={[styles.alertaType, { color: alertaConfig.color }]}>
          {alertaConfig.text}
        </ThemedText>
      </View>
      <ThemedText
        type="defaultSemiBold"
        style={[styles.alertaProduct, isDark && styles.textDark]}
        numberOfLines={1}
      >
        {alerta.producto}
      </ThemedText>
      <ThemedText style={[styles.alertaDetail, isDark && styles.textMutedDark]}>
        Lote: {alerta.lote}
      </ThemedText>
      {/* Solo muestra días restantes para alertas de caducidad */}
      {alerta.tipo === "caducidad" && alerta.diasRestantes !== undefined && (
        <View style={[styles.alertaBadge, isDark && styles.alertaBadgeDark]}>
          <ThemedText
            style={[styles.alertaBadgeText, isDark && styles.textDark]}
          >
            {alerta.diasRestantes} días restantes
          </ThemedText>
        </View>
      )}

      {/* Solo muestra stock para alertas de stock bajo */}
      {alerta.tipo === "stock" && alerta.stockActual !== undefined && (
        <View style={[styles.alertaBadge, isDark && styles.alertaBadgeDark]}>
          <ThemedText
            style={[styles.alertaBadgeText, isDark && styles.textDark]}
          >
            Stock: {alerta.stockActual}/{alerta.stockMinimo}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  mainContainerDark: {
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
    color: "#4B9CD3",
    textAlign: "center",
    fontFamily: "Poppins_500Medium",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  headerContainer: {
    marginBottom: 8,
  },
  headerContainerDark: {
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4B9CD3",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  welcomeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  welcomeText: {
    fontSize: 23,
    marginBottom: 2,
    color: "#000000ff",
    fontFamily: "Poppins_700Bold",
  },
  userNameText: {
    fontSize: 23,
    marginBottom: 2,
    color: "#000000ff",
    fontFamily: "Poppins_500Medium",
  },
  subtitleText: {
    fontSize: 14,
    marginTop: -5,
    color: "#539DF3",
    fontFamily: "Poppins_400Regular",
  },
  notificationButton: {
    padding: 8,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 1,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: "white",
    top: -3,
    fontSize: 11,
    fontFamily: "Poppins_700Bold",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 62,
  },
  dateText: {
    fontSize: 14,
    color: "#64748B",
    textTransform: "capitalize",
    fontFamily: "Poppins_400Regular",
  },
  // Alertas Mejoradas
  alertasSection: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  alertasSectionDark: {
    backgroundColor: "#1c1c1e",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  alertasScroll: {
    gap: 12,
  },
  alertaCard: {
    padding: 16,
    borderRadius: 12,
    width: 240,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  alertaCardDark: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  alertaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertaIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  alertaType: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  alertaProduct: {
    fontSize: 16,
    color: "#000000ff",
    marginBottom: 6,
    fontFamily: "Poppins_500Medium",
  },
  alertaDetail: {
    fontSize: 13,
    color: "#353535ff",
    marginBottom: 8,
    fontFamily: "Poppins_400Regular",
  },
  alertaBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.84)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  alertaBadgeDark: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  alertaBadgeText: {
    fontSize: 11,
    color: "#475569",
    fontFamily: "Poppins_500Medium",
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 8,
  },
  cardDark: {
    backgroundColor: "#1c1c1e",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardValue: {
    fontSize: 24,
    marginBottom: 4,
    fontFamily: "Poppins_700Bold",
  },
  cardTitle: {
    fontSize: 14,
    marginBottom: 2,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#000000ff",
    fontFamily: "Poppins_500Medium",
  },
  seeAllText: {
    fontSize: 14,
    color: "#4B9CD3",
    fontFamily: "Poppins_500Medium",
  },
  horizontalScroll: {
    gap: 16,
  },
  activeProductCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#4B9CD3",
    borderWidth: 0.8,
    borderRadius: 16,
    padding: 19,
    width: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  activeProductCardDark: {
    backgroundColor: "#1c1c1e",
    borderColor: "#333",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  productIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  productIconDark: {
    backgroundColor: "#2c2c2e",
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  productDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  productText: {
    fontSize: 13,
    color: "#64748B",
    fontFamily: "Poppins_400Regular",
  },
  movimientosContainer: {
    gap: 12,
  },
  movItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 12,
  },
  movItemDark: {
    backgroundColor: "#1c1c1e",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  movIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  movInfo: {
    flex: 1,
    gap: 2,
  },
  movProduct: {
    fontSize: 15,
    color: "#000000ff",
    fontFamily: "Poppins_500Medium",
  },
  movDetails: {
    fontSize: 13,
    color: "#4a5663ff",
    fontFamily: "Poppins_400Regular",
  },
  movMotivo: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontFamily: "Poppins_500Medium",
    fontStyle: "italic",
    marginTop: 4,
  },
  movMotivoDark: {
    color: "#888",
    backgroundColor: "#2c2c2e",
  },
  movDate: {
    fontSize: 12,
    color: "#000000ff",
    fontFamily: "Poppins_400Regular",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyStateDark: {
    backgroundColor: "#1c1c1e",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 34,
  },
  modalContentDark: {
    backgroundColor: "#1c1c1e",
  },
  modalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalHeaderDark: {
    borderBottomColor: "#333",
  },
  modalHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 16, // Espacio entre el título y el botón de cerrar
  },
  modalTitle: {
    fontSize: 18,
    color: "#000000ff",
    marginBottom: 4,
    fontFamily: "Poppins_700Bold",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#4a5663ff",
    fontFamily: "Poppins_400Regular",
  },
  closeButton: {
    padding: 4,
    marginTop: -4, // Ajuste para alinear con el título
  },
  modalScrollContent: {
    padding: 24,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSectionTitle: {
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Poppins_500Medium",
  },
  notificationItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#E2E8F0",
  },
  notificationItemDark: {
    borderLeftColor: "#333",
  },
  notificationProduct: {
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 4,
    fontFamily: "Poppins_500Medium",
  },
  notificationText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 2,
    fontFamily: "Poppins_400Regular",
  },
  notificationSubtext: {
    fontSize: 12,
    color: "#94A3B8",
    fontFamily: "Poppins_400Regular",
  },

  // Text Colors para Dark Mode
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#a8a8a8ff",
  },
});
