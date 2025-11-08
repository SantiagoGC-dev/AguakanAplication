import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

//Configuración de la API y Tipos
const API_BASE_URL = "http://192.168.0.166:3000";

interface FilterOption {
  label: string;
  value: string;
}

interface EstatusProducto {
  id_estatus_producto: number;
  nombre_estatus: string;
}

interface ProductoTipo {
  id_tipo_producto: number;
  nombre_tipo: string;
}

//Componente Campo de Formulario Funcional
interface FormFieldProps {
  label: string;
  name: string;
  isDate?: boolean;
  keyboardType?: "default" | "numeric";
  value: any;
  onChange: (value: any) => void;
}

interface ProductoItemProps {
  item: any;
  expandedId: number | null;
  onExpand: (id: number) => void;
  onViewDetails: (id: number) => void;
}
// --- Funciones auxiliares para estatus ---
const formatFecha = (fecha: string): string => {
  if (!fecha) return "N/A";
  return fecha.split("T")[0];
};

// Función para calcular días hasta caducidad
const calcularDiasHastaCaducidad = (caducidad: string): number | null => {
  if (!caducidad) return null;
  try {
    const hoy = new Date();
    const fechaCaducidad = new Date(caducidad);
    // Validar que la fecha sea válida
    if (isNaN(fechaCaducidad.getTime())) return null;

    const diffTime = fechaCaducidad.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    console.error("Error calculando días hasta caducidad:", error);
    return null;
  }
};

// Función para obtener color de estatus mejorada
const getEstatusColor = (producto: any): string => {
  const idEstatus = producto.id_estatus_producto;

  // ✅ USAR SOLO LOS ESTATUS DE LA BASE DE DATOS - NO CALCULAR
  switch (idEstatus) {
    case 1:
      return "#28a745"; // Disponible
    case 2:
      return "#6c757d"; // Sin stock
    case 3:
      return "#ffc107"; // Bajo stock
    case 5:
      return "#007bff"; // En uso
    case 6:
      return "#dc3545"; // Baja
    case 7:
      return "#6f42c1"; // Caducado
    case 8:
      return "#fd7e14"; // Próximo a caducar
    default:
      return "#6c757d";
  }
};

// Función para obtener texto de estatus - VERSIÓN UNIFICADA
const getEstatusText = (producto: any): string => {
  return producto.estatus || producto.nombre_estatus || "Disponible";
};

//Componente para campos de texto y fecha
const FormField = ({
  label,
  name,
  isDate = false,
  keyboardType = "default",
  value,
  onChange,
}: FormFieldProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (Platform.OS === "android") {
      setShowPicker(false); // Cerrar inmediatamente en Android
    }

    if (selectedDate) {
      setTempDate(selectedDate);

      // En iOS, no aplicar inmediatamente, esperar a que el usuario confirme
      if (Platform.OS === "android") {
        applyDate(selectedDate);
      }
    }

    // Si el usuario cancela en Android
    if (Platform.OS === "android" && event.type === "dismissed") {
      setShowPicker(false);
    }
  };

  const applyDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const monthString = String(month).padStart(2, "0");
    const dayString = String(day).padStart(2, "0");
    const formattedDate = `${year}-${monthString}-${dayString}`;
    onChange(formattedDate);
  };

  const handleConfirmDate = () => {
    if (tempDate) {
      applyDate(tempDate);
    }
    setShowPicker(false);
    setTempDate(null);
  };

  const handleCancelDate = () => {
    setShowPicker(false);
    setTempDate(null);
  };

  const showDatePicker = () => {
    setTempDate(value ? new Date(value) : new Date());
    setShowPicker(true);
    Keyboard.dismiss();
  };

  const dateValue = tempDate || (value ? new Date(value) : new Date());

  if (isDate) {
    return (
      <View style={styles.formFieldContainer}>
        <TouchableOpacity
          onPress={showDatePicker}
          style={styles.dateTouchableArea}
        >
          <Text style={value ? styles.dateText : styles.datePlaceholder}>
            {value ? `Caducidad: ${value}` : label}
          </Text>
          <Icon name="calendar-today" size={20} color="#539DF3" />
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.datePickerContainer}>
            {/* Header del DatePicker */}
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                Seleccionar fecha de caducidad
              </Text>
            </View>

            {/* DateTimePicker visible */}
            <DateTimePicker
              value={dateValue}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              style={styles.datePicker}
              textColor="#000000" // Forzar color negro
            />

            {/* Botones de acción para iOS */}
            {Platform.OS === "ios" && (
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  onPress={handleCancelDate}
                  style={[
                    styles.datePickerButton,
                    styles.datePickerButtonCancel,
                  ]}
                >
                  <Text style={styles.datePickerButtonTextCancel}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmDate}
                  style={[
                    styles.datePickerButton,
                    styles.datePickerButtonConfirm,
                  ]}
                >
                  <Text style={styles.datePickerButtonTextConfirm}>
                    Confirmar
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Botón de confirmación para Android */}
            {Platform.OS === "android" && (
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={styles.androidCloseButton}
              >
                <Text style={styles.androidCloseButtonText}>Cerrar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.formFieldContainer}>
      <TextInput
        style={styles.formInput}
        placeholder={label}
        placeholderTextColor="#999"
        keyboardType={keyboardType}
        onChangeText={(text) => onChange(text)}
        value={value?.toString() || ""}
      />
    </View>
  );
};

// Componente para selectores
const FormSelect = ({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: any;
  onValueChange: (value: any) => void;
  options: any[];
}) => (
  <View style={styles.formFieldContainer}>
    <Text style={styles.selectLabel}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.optionsRow}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.value || option.id || index}
            style={[
              styles.optionChip,
              value === option.value && styles.optionChipSelected,
            ]}
            onPress={() => onValueChange(option.value)}
          >
            <Text
              style={[
                styles.optionChipText,
                value === option.value && styles.optionChipTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
);

// AGREGAR este componente nuevo para laboratorios
const FormSelectLaboratorio = ({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: any;
  onValueChange: (value: any) => void;
  options: any[];
}) => (
  <View style={styles.formFieldContainer}>
    <Text style={styles.selectLabel}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.optionsRow}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id_laboratorio}
            style={[
              styles.optionChip,
              value === option.id_laboratorio && styles.optionChipSelected,
            ]}
            onPress={() => onValueChange(option.id_laboratorio)}
          >
            <Text
              style={[
                styles.optionChipText,
                value === option.id_laboratorio &&
                  styles.optionChipTextSelected,
              ]}
            >
              {option.ubicacion}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
);

const ProductoItem = React.memo<ProductoItemProps>(
  ({ item, expandedId, onExpand, onViewDetails }) => {
    return (
      <TouchableOpacity
        style={[
          styles.row,
          expandedId === item.id_producto && styles.rowExpanded,
        ]}
        onPress={() => onExpand(item.id_producto)}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{item.nombre}</Text>
            <Text style={styles.rowSubtitle}>
              {item.marca} • {item.tipo}
            </Text>
          </View>
          <View style={styles.rowStatusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getEstatusColor(item) + "20" },
              ]}
            >
              <Text
                style={[styles.rowStatus, { color: getEstatusColor(item) }]}
              >
                {getEstatusText(item)}
              </Text>
            </View>
            <Icon
              name={
                expandedId === item.id_producto ? "expand-less" : "expand-more"
              }
              size={20}
              color="#539DF3"
              style={styles.expandIcon}
            />
          </View>
        </View>

        {expandedId === item.id_producto && (
          <View style={styles.rowDetails}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Lote</Text>
                <Text style={styles.detailValue}>{item.lote || "N/A"}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Stock</Text>
                <Text style={styles.detailValue}>
                  {item.existencia_actual} / {item.stock_minimo}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Prioridad</Text>
                <Text style={styles.detailValue}>
                  {item.prioridad || "Media"}
                </Text>
              </View>
            </View>

            {/* Información adicional para reactivos */}
            {item.id_tipo_producto === 1 && item.caducidad && (
              <View style={styles.detailExtra}>
                <Text style={styles.detailLabel}>Caducidad</Text>
                <Text style={styles.detailValue}>
                  {formatFecha(item.caducidad)}
                  {(() => {
                    const dias = calcularDiasHastaCaducidad(item.caducidad);
                    if (dias === null) return null;

                    if (dias < 0) {
                      return null;
                    } else if (dias === 0) {
                      return (
                        <Text style={{ color: "#D97706", fontWeight: "bold" }}>
                          {" (Caduca hoy)"}
                        </Text>
                      );
                    } else if (dias <= 15) {
                      return (
                        <Text style={{ color: "#ff6b6b", fontWeight: "bold" }}>
                          {` (Quedan ${dias} días)`}
                        </Text>
                      );
                    }
                    return null;
                  })()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.detailButton}
              onPress={() => onViewDetails(item.id_producto)}
            >
              <Text style={styles.detailButtonText}>Ver Detalles</Text>
              <Icon name="arrow-forward" size={16} color="#539DF3" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }
);

// --- InventarioScreen Principal ---
export default function InventarioScreen() {
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaTerm, setBusquedaTerm] = useState(""); // PARA DEBOUNCE
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string }>();

  // --- NUEVOS ESTADOS DE PAGINACIÓN ---
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_LIMIT = 20; // Debe coincidir con el 'limit' del backend

  // Estado y opciones para ordenamiento
  const [orden, setOrden] = useState("antiguos");
  const ordenOptions: FilterOption[] = [
    { label: "Más antiguos", value: "antiguos" },
    { label: "Más recientes", value: "recientes" },
  ];
  // Estado para filtro de estatus
  const [estatusFiltro, setEstatusFiltro] = useState("todos");
  // Estados para Modals
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProductType, setSelectedProductType] =
    useState<string>("Equipo");

  // Estados del Formulario (para la inserción)
  const [formState, setFormState] = useState<any>({});
  // Estados de filtros
  const [periodo, setPeriodo] = useState("todos");
  const [tipoProductoFiltro, setTipoProductoFiltro] = useState("todos");
  const [prioridad, setPrioridad] = useState("todos");
  const [tiposDisponibles, setTiposDisponibles] = useState<ProductoTipo[]>([]);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);
  // Nuevos estados para laboratorios y estatus
  const [laboratorios, setLaboratorios] = useState<any[]>([]);
  const [estatusProductos, setEstatusProductos] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  //Estado para el refresh
  const [refreshing, setRefreshing] = useState(false);

  // Estado para el boton de guardar producto
  const [guardandoProducto, setGuardandoProducto] = useState(false);

  // --- Opciones estáticas para filtros ---
  const periodoOptions: FilterOption[] = [
    { label: "Todos", value: "todos" },
    { label: "Semana", value: "semanal" },
    { label: "Mes", value: "mensual" },
    { label: "Trimestre", value: "trimestral" },
    { label: "Año", value: "anual" },
  ];

  const prioridadOptions: FilterOption[] = [
    { label: "Todas", value: "todos" },
    { label: "Alta", value: "1" },
    { label: "Media", value: "2" },
    { label: "Baja", value: "3" },
  ];

  // Opciones de estatus dinámicas del backend
  const estatusOptions: FilterOption[] = [
    { label: "Todos", value: "todos" },
    ...estatusProductos.map((estatus) => ({
      label: estatus.nombre_estatus,
      value: estatus.id_estatus_producto.toString(),
    })),
  ];

  //Funcion para el pulldown refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProducts(1, true);
    } catch (error) {
      console.error("Error en refresh:", error);
      Alert.alert("Error", "No se pudo actualizar el inventario");
    } finally {
      setRefreshing(false);
    }
  }, [
    busquedaTerm,
    tipoProductoFiltro,
    prioridad,
    estatusFiltro,
    periodo,
    orden,
  ]);

  // --- Funciones de Carga de Datos ---
  const fetchProducts = async (
    pageToFetch = 1,
    isRefresh = false,
    estatusOverride: string | null = null
  ) => {
    // Evitar cargas múltiples si ya se está cargando o si no hay más páginas
    if ((loadingMore && !isRefresh) || (!hasMore && !isRefresh)) return;

    if (pageToFetch > 1) {
      setLoadingMore(true);
    } else if (!isRefresh) {
      setCargandoInicial(true);
    }

    try {
      console.log(
        `🔄 Cargando productos... Página: ${pageToFetch}, Refresh: ${isRefresh}`
      );

      // 1. Construir los parámetros de consulta
      const params = new URLSearchParams();
      params.append("page", pageToFetch.toString());
      params.append("limit", PAGE_LIMIT.toString());
      params.append("orden", orden); // Añadir orden

      if (busquedaTerm.trim()) params.append("busqueda", busquedaTerm.trim());
      if (tipoProductoFiltro !== "todos")
        params.append("tipo", tipoProductoFiltro);
      if (prioridad !== "todos") params.append("prioridad", prioridad);

      const finalEstatus =
        estatusOverride !== null ? estatusOverride : estatusFiltro;
      if (finalEstatus !== "todos") {
        params.append("estatus", finalEstatus);
      }

      if (periodo !== "todos") params.append("periodo", periodo);

      // 2. Hacer el fetch
      const res = await fetch(
        `${API_BASE_URL}/api/productos?${params.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const data = await res.json();
      const newProducts = data.products || [];
      const newTotalCount = data.totalCount || 0;

      console.log(
        `📦 Productos cargados: ${newProducts.length} de ${newTotalCount}`
      );

      // 3. Actualizar el estado (con lógica anti-duplicados)
      if (isRefresh || pageToFetch === 1) {
        // 1. Para un refresh, solo necesitamos de-duplicar el nuevo batch
        const uniqueIds = new Set();
        const uniqueProducts = newProducts.filter((p: any) => {
          if (!p || p.id_producto === null || p.id_producto === undefined)
            return false;
          if (uniqueIds.has(p.id_producto)) {
            return false;
          }
          uniqueIds.add(p.id_producto);
          return true;
        });

        setProductos(uniqueProducts);
        setPage(1); // Resetear contador de página
      } else {
        // 2. Para cargar más, de-duplicamos contra 'prev' Y contra sí mismo
        setProductos((prev) => {
          // Usamos 'prev' como base para el Set
          const existingIds = new Set(prev.map((p) => p.id_producto));

          const uniqueNewProducts = newProducts.filter((p: any) => {
            if (!p || p.id_producto === null || p.id_producto === undefined) {
              return false; // Ignorar data mala
            }

            // Comprobar si ya existe (en prev O en el batch actual)
            if (existingIds.has(p.id_producto)) {
              return false;
            }

            // Añadir al set para de-duplicar el resto del batch
            existingIds.add(p.id_producto);
            return true;
          });

          return [...prev, ...uniqueNewProducts];
        });
      }

      // 4. Actualizar estado de paginación
      setHasMore(pageToFetch * PAGE_LIMIT < newTotalCount);
    } catch (err) {
      console.error("❌ Error cargando productos:", err);
      Alert.alert("Error", "No se pudieron cargar los productos");
    } finally {
      setCargandoInicial(false);
      setLoadingMore(false); // Siempre detener el loading de "cargar más"
    }
  };

  const fetchProductTypes = () => {
    fetch(`${API_BASE_URL}/api/productos/tipoproducto`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setTiposDisponibles(data);
        if (data.length > 0) {
          setSelectedProductType(data[0].nombre_tipo);
        }
      })
      .catch((err) => {
        console.error("Error cargando tipos:", err);
        setTiposDisponibles([
          { id_tipo_producto: 1, nombre_tipo: "Equipo" },
          { id_tipo_producto: 2, nombre_tipo: "Reactivo" },
          { id_tipo_producto: 3, nombre_tipo: "Material" },
        ]);
      });
  };

  const fetchLaboratoriosYEstatus = async () => {
    try {
      setLoadingData(true);

      // Cargar laboratorios
      try {
        const labResponse = await fetch(
          `${API_BASE_URL}/api/productos/laboratorios/list`
        );
        if (labResponse.ok) {
          const labData = await labResponse.json();
          setLaboratorios(Array.isArray(labData) ? labData : []);
        } else {
          setLaboratorios([]);
        }
      } catch (labError) {
        setLaboratorios([]);
      }

      // Cargar estatus
      try {
        const estatusResponse = await fetch(
          `${API_BASE_URL}/api/productos/estatus/list`
        );
        if (estatusResponse.ok) {
          const estatusData = await estatusResponse.json();
          setEstatusProductos(Array.isArray(estatusData) ? estatusData : []);
        } else {
          setEstatusProductos([]);
        }
      } catch (estatusError) {
        setEstatusProductos([]);
      }
    } catch (error) {
      setLaboratorios([]);
      setEstatusProductos([]);
    } finally {
      setLoadingData(false);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchProductTypes();
    fetchLaboratoriosYEstatus();
  }, []);

  useFocusEffect(
    React.useCallback(() => {

      if (filter === "en-uso") {
        return;
      }

      if (productos.length > 0) {
        return;
      }

      // Si no hay filtro "en-uso" Y la lista está vacía,
      // carga los productos normalmente (página 1).
      fetchProducts(1, true, null); // null = sin override
    }, [filter, productos.length]) 
  );

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusquedaTerm(busqueda);
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda]);

  // Efecto para aplicar el filtro "en-uso" desde el dashboard
  useEffect(() => {
    console.log("Filter parameter:", filter);
    if (filter === "en-uso") {
      const statusEnUso = "5"; 
      // 1. Actualizar el estado para que la UI sea consistente
      setEstatusFiltro(statusEnUso);
      setFiltrosAplicados(true);

      // 2. LLAMAR EL FETCH DIRECTAMENTE CON EL FILTRO
      fetchProducts(1, true, statusEnUso);
    }
  }, [filter, router]);

  useEffect(() => {
    setFormState({});
    const tipoInfo = tiposDisponibles.find(
      (t) => t.nombre_tipo === selectedProductType
    );
    if (tipoInfo) {
      setFormState({
        id_tipo_producto: tipoInfo.id_tipo_producto,
        id_laboratorio: laboratorios[0]?.id_laboratorio || 1,
        id_estatus_producto: 1,
        id_prioridad: "2", 
      });
    }
  }, [selectedProductType, tiposDisponibles, laboratorios]);

  // useEffect: Detecta cambios en CUALQUIER filtro y recarga la lista
  useEffect(() => {
    if (!cargandoInicial) {
      fetchProducts(1, true); 
    }
  }, [
    busquedaTerm,
    tipoProductoFiltro,
    prioridad,
    estatusFiltro,
    periodo,
    orden,
  ]);

  // --- Lógica del Formulario ---
  const handleFormChange = (fieldName: string, value: any) => {
    let parsedValue = value;
    if (
      [
        "existencia_actual",
        "stock_minimo",
        "id_laboratorio",
        "id_estatus_producto",
        "cantidad_ingresada_reactivo",
        "cantidad_ingresada_material",
      ].includes(fieldName)
    ) {
      parsedValue = value === "" ? null : Number(value);
    }

    setFormState((prev: any) => ({ ...prev, [fieldName]: parsedValue }));
  };

  const handleSaveNewProduct = async () => {
    if (guardandoProducto) return; // Evita múltiples clics
    setGuardandoProducto(true);    // Bloquea el botón
    const tipoInfo = tiposDisponibles.find(
      (t) => t.nombre_tipo === selectedProductType
    );

    if (!tipoInfo) {
      Alert.alert("Error", "Tipo de producto no seleccionado o no encontrado.");
      return;
    }

    const isReactivo = tipoInfo.nombre_tipo === "Reactivo";
    const isMaterial = tipoInfo.nombre_tipo === "Material";
    const isEquipo = tipoInfo.nombre_tipo === "Equipo";

    const existencia = isReactivo
      ? formState.cantidad_ingresada_reactivo
      : isMaterial
      ? formState.cantidad_ingresada_material
      : isEquipo
      ? 1
      : formState.existencia_actual;

    const dataToSend = {
      ...formState,
      id_tipo_producto: tipoInfo.id_tipo_producto,
      existencia_actual: Number(existencia) || (isEquipo ? 1 : 0),
      lote: formState.lote || null,
      imagen: formState.imagen || null,
      id_laboratorio:
        formState.id_laboratorio || laboratorios[0]?.id_laboratorio || 1,
      id_estatus_producto: 1,
      stock_minimo: formState.stock_minimo || 0,
      id_prioridad: formState.id_prioridad || "2",
    };

    // Validaciones básicas por tipo de producto
    if (isEquipo) {
      if (!dataToSend.nombre || !dataToSend.marca || !dataToSend.modelo) {
        Alert.alert(
          "Error",
          "Por favor, complete los campos obligatorios (Nombre, Marca, Modelo)."
        );
        return;
      }
    } else if (isReactivo) {
      if (
        !dataToSend.nombre ||
        !dataToSend.marca ||
        !dataToSend.cantidad_ingresada_reactivo
      ) {
        Alert.alert(
          "Error",
          "Por favor, complete los campos obligatorios (Nombre, Marca, Cantidad a ingresar)."
        );
        return;
      }
    } else if (isMaterial) {
      if (
        !dataToSend.nombre ||
        !dataToSend.marca ||
        !dataToSend.cantidad_ingresada_material
      ) {
        Alert.alert(
          "Error",
          "Por favor, complete los campos obligatorios (Nombre, Marca, Cantidad a ingresar)."
        );
        return;
      }
    }

    try {
    const response = await fetch(`${API_BASE_URL}/api/productos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataToSend),
    });

    const result = await response.json();

    if (response.ok) {
      Alert.alert(
        "Éxito",
        `Producto "${dataToSend.nombre}" (${tipoInfo.nombre_tipo}) creado con éxito!`
      );
      setShowAddModal(false);
      setFormState({});
      fetchProducts(); // Recargar la lista
    } else {
      Alert.alert(
        "Error",
        `Error al guardar: ${result.error || "Verifique los campos."}`
      );
    }
  } catch (error) {
    Alert.alert("Error", "Hubo un error de conexión al servidor.");
  } finally {
    setGuardandoProducto(false); // Libera el botón
  }
};

  const renderProductForm = () => {
    if (tiposDisponibles.length === 0) return null;

    const commonProps = (
      name: string,
      label: string,
      isDate: boolean = false,
      keyboardType: "default" | "numeric" = "default"
    ) => ({
      name,
      label,
      isDate,
      keyboardType,
      value: formState[name],
      onChange: (v: any) => handleFormChange(name, v),
    });

    const prioridadOptions = [
      { value: "1", label: "Alta" },
      { value: "2", label: "Media" },
      { value: "3", label: "Baja" },
    ];

    switch (selectedProductType) {
      case "Equipo":
        return (
          <View key="EquipoForm">
            <FormField {...commonProps("nombre", "Nombre*")} />
            <FormField {...commonProps("id_agk", "ID AGK")} />
            <FormField {...commonProps("marca", "Marca*")} />
            <FormField {...commonProps("modelo", "Modelo*")} />

            {/* PRIORIDAD - CORREGIDO */}
            <FormSelect
              label="Prioridad"
              value={formState.id_prioridad}
              onValueChange={(v) => handleFormChange("id_prioridad", v)}
              options={prioridadOptions}
            />

            <FormField {...commonProps("numero_serie", "No. de serie")} />
            <FormField
              {...commonProps("rango_medicion", "Rango de medición")}
            />
            <FormField {...commonProps("resolucion", "Resolución")} />
            <FormField
              {...commonProps("intervalo_trabajo", "Intervalo de trabajo")}
            />

            {/* LABORATORIO - CORREGIDO */}
            <FormSelectLaboratorio
              label="Ubicación (Laboratorio)"
              value={formState.id_laboratorio}
              onValueChange={(v) => handleFormChange("id_laboratorio", v)}
              options={laboratorios}
            />

            <Text style={styles.infoText}>
              *El estatus será "Disponible" automáticamente
            </Text>
          </View>
        );
      case "Reactivo":
        return (
          <View key="ReactivoForm">
            <FormField {...commonProps("nombre", "Nombre*")} />
            <FormField {...commonProps("marca", "Marca*")} />
            <FormField {...commonProps("lote", "Lote")} />

            {/* PRIORIDAD - CORREGIDO */}
            <FormSelect
              label="Prioridad"
              value={formState.id_prioridad}
              onValueChange={(v) => handleFormChange("id_prioridad", v)}
              options={prioridadOptions}
            />

            <FormField
              {...commonProps("presentacion", "Presentación (ej: 50ml)")}
            />
            <FormField {...commonProps("caducidad", "Caducidad", true)} />
            <FormField
              {...commonProps(
                "cantidad_ingresada_reactivo",
                "Cantidad a ingresar*",
                false,
                "numeric"
              )}
            />
            <FormField
              {...commonProps("stock_minimo", "Stock Mínimo", false, "numeric")}
            />
            <Text style={styles.infoText}>
              *El estatus será "Disponible" automáticamente
            </Text>
          </View>
        );
      case "Material":
        return (
          <View key="MaterialForm">
            <FormField {...commonProps("nombre", "Nombre*")} />
            <FormField {...commonProps("marca", "Marca*")} />
            <FormField {...commonProps("lote", "Lote")} />

            {/* PRIORIDAD - CORREGIDO */}
            <FormSelect
              label="Prioridad"
              value={formState.id_prioridad}
              onValueChange={(v) => handleFormChange("id_prioridad", v)}
              options={prioridadOptions}
            />

            <FormField
              {...commonProps(
                "cantidad_ingresada_material",
                "Cantidad a ingresar*",
                false,
                "numeric"
              )}
            />
            <Text style={styles.infoText}>
              *El estatus será "Disponible" automáticamente
            </Text>
          </View>
        );
      default:
        return (
          <Text key="defaultForm" style={styles.emptyStateText}>
            Selecciona un tipo para empezar.
          </Text>
        );
    }
  };

  const handleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const aplicarFiltros = () => {
    // Considerar filtros aplicados si algún filtro no está en "todos" o el orden no es el por defecto
    const hayFiltrosActivos =
      periodo !== "todos" ||
      tipoProductoFiltro !== "todos" ||
      prioridad !== "todos" ||
      estatusFiltro !== "todos" ||
      orden !== "antiguos";

    setFiltrosAplicados(hayFiltrosActivos);
    setShowFilters(false);
  };

  const resetearFiltros = () => {
    // 1. Poner el estado de la UI en "todos" o valores por defecto
    setPeriodo("todos");
    setTipoProductoFiltro("todos");
    setPrioridad("todos");
    setEstatusFiltro("todos");
    setOrden("antiguos"); 
    setBusqueda(""); 

    setFiltrosAplicados(false);

    // 2. Limpiar el filtro de la URL
    router.setParams({ filter: undefined });

  };

  const handleLoadMore = () => {
    console.log("-> Intentando cargar más...", { loadingMore, hasMore });
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, false); 
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="large" color="#539DF3" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Inventario</Text>
            <Text style={styles.subtitle}>Todos tus productos</Text>
          </View>
          {filtrosAplicados && (
            <TouchableOpacity
              style={styles.filtrosActivosBadge}
              onPress={resetearFiltros}
            >
              <Text style={styles.filtrosActivosText}>Filtros activos</Text>
              <Icon name="close" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Barra de búsqueda y acciones */}
        <View style={styles.topBar}>
          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color="#666"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Buscar producto..."
              placeholderTextColor="#999"
              value={busqueda}
              onChangeText={setBusqueda}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filtrosAplicados && styles.filterBtnActive,
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Icon
              name="filter-list"
              size={20}
              color={filtrosAplicados ? "#fff" : "#666"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
          >
            <Icon name="add" size={20} color="#fff" />
            <Text style={styles.addText}>Añadir</Text>
          </TouchableOpacity>
        </View>

        {/* Loading inicial */}
        {cargandoInicial && productos.length === 0 ? ( 
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#539DF3" />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        ) : (
          /* Lista de Productos CON PULLDOWN REFRESH */
          <FlatList
            data={productos}
            keyExtractor={(item) => item.id_producto.toString()}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            // RefreshControl para pulldown refresh
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#539DF3"]}
                tintColor="#539DF3"
                title="Actualizando..."
                titleColor="#666"
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            renderItem={({ item }) => (
              <ProductoItem
                item={item}
                expandedId={expandedId}
                onExpand={handleExpand}
                onViewDetails={(id) =>
                  router.push({
                    pathname: "/detail/[id]",
                    params: { id: id.toString() },
                  })
                }
              />
            )}
            ListEmptyComponent={
              !cargandoInicial ? (
                <View style={styles.emptyState}>
                  <Icon name="inventory" size={60} color="#ccc" />
                  <Text style={styles.emptyStateTitle}>
                    {filtrosAplicados
                      ? "No se encontraron resultados"
                      : "No hay productos"}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {filtrosAplicados
                      ? "Intenta con otros filtros"
                      : "Comienza agregando tu primer producto"}
                  </Text>

                  {/* Botón de refresh en empty state */}
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                  >
                    <Icon name="refresh" size={20} color="#539DF3" />
                    <Text style={styles.refreshButtonText}>Actualizar</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        )}

        {/* Modal de Añadir Producto */}
        <Modal visible={showAddModal} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => Keyboard.dismiss()}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nuevo producto</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Selector de Tipo de Producto */}
                <View style={styles.addTypeSelector}>
                  {tiposDisponibles.map((tipo) => (
                    <TouchableOpacity
                      key={tipo.id_tipo_producto}
                      style={[
                        styles.addTypeButton,
                        selectedProductType === tipo.nombre_tipo &&
                          styles.addTypeButtonActive,
                      ]}
                      onPress={() => setSelectedProductType(tipo.nombre_tipo)}
                    >
                      <Text
                        style={[
                          styles.addTypeText,
                          selectedProductType === tipo.nombre_tipo &&
                            styles.addTypeTextActive,
                        ]}
                      >
                        {tipo.nombre_tipo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ScrollView ajustado para el teclado */}
                <ScrollView
                  style={styles.addScroll}
                  showsVerticalScrollIndicator={true}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {renderProductForm()}
                  <Text style={styles.requiredNote}>* Campos obligatorios</Text>
                </ScrollView>

                {/* Botones de acción */}
                <View style={styles.buttonRow}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </Pressable>

                  <Pressable
                    style={styles.applyBtn}
                    onPress={handleSaveNewProduct}
                  >
                    <Text style={styles.applyBtnText}>Guardar Producto</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        {/* Modal de Filtros */}
        <Modal visible={showFilters} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filtros</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowFilters(false)}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.filtersScroll}>
                {/* Nuevo Filtro: Ordenamiento */}
                <View style={styles.filterCard}>
                  <Text style={styles.filterCardTitle}>Ordenar por</Text>
                  <View style={styles.filterOptions}>
                    {ordenOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          orden === option.value && styles.filterOptionActive,
                        ]}
                        onPress={() => setOrden(option.value)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            orden === option.value &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.filterCard}>
                  <Text style={styles.filterCardTitle}>
                    Selección de periodo
                  </Text>
                  <View style={styles.filterOptions}>
                    {periodoOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          periodo === option.value && styles.filterOptionActive,
                        ]}
                        onPress={() => setPeriodo(option.value)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            periodo === option.value &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.filterCard}>
                  <Text style={styles.filterCardTitle}>Tipo de Producto</Text>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tipoProductoFiltro === "todos" &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setTipoProductoFiltro("todos")}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          tipoProductoFiltro === "todos" &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {tiposDisponibles.map((tipo) => {
                      const tipoNormalizado = tipo.nombre_tipo.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={tipo.id_tipo_producto}
                          style={[
                            styles.filterOption,
                            tipoProductoFiltro === tipoNormalizado &&
                              styles.filterOptionActive,
                          ]}
                          onPress={() => setTipoProductoFiltro(tipoNormalizado)}
                        >
                          <Text
                            style={[
                              styles.filterOptionText,
                              tipoProductoFiltro === tipoNormalizado &&
                                styles.filterOptionTextActive,
                            ]}
                          >
                            {tipo.nombre_tipo}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.filterCard}>
                  <Text style={styles.filterCardTitle}>Prioridad</Text>
                  <View style={styles.filterOptions}>
                    {prioridadOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          prioridad === option.value &&
                            styles.filterOptionActive,
                        ]}
                        onPress={() => setPrioridad(option.value)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            prioridad === option.value &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.filterCard}>
                  <Text style={styles.filterCardTitle}>Estatus</Text>
                  <View style={styles.filterOptions}>
                    {estatusOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.filterOption,
                          estatusFiltro === option.value &&
                            styles.filterOptionActive,
                        ]}
                        onPress={() => setEstatusFiltro(option.value)}
                      >
                        <Text
                          style={[
                            styles.filterOptionText,
                            estatusFiltro === option.value &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View style={styles.filterActions}>
                <Pressable style={styles.resetBtn} onPress={resetearFiltros}>
                  <Text style={styles.resetBtnText}>Limpiar Filtros</Text>
                </Pressable>
                <Pressable style={styles.applyBtn} onPress={aplicarFiltros}>
                  <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc", paddingBottom: -90 },
  container: { flex: 1, paddingVertical: 1, paddingHorizontal: 16, },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingTop: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    fontWeight: "700",
    color: "#000000ff",
    marginBottom: 1,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#454545ff",
    fontWeight: "400",
  },
  filtrosActivosBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#539DF3",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  filtrosActivosText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    marginRight: 6,
  },
  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#333",
  },
  filterBtn: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterBtnActive: {
    backgroundColor: "#539DF3",
  },
  addBtn: {
    backgroundColor: "#539DF3",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#539DF3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },

  // List Items
  row: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  rowExpanded: {
    backgroundColor: "#fafbfc",
    borderColor: "#539DF3",
    shadowColor: "#539DF3",
    shadowOpacity: 0.1,
  },
  rowMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rowContent: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    fontWeight: "400",
  },
  rowStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  rowStatus: {
    fontWeight: "600",
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
  },
  expandIcon: {
    marginLeft: 4,
  },

  // Row Details
  rowDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#1a1a1a",
    fontWeight: "600",
  },
  detailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  detailButtonText: {
    color: "#539DF3",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%", 
    minHeight: "60%", 
  },
  scrollContent: {
    paddingBottom: 20, 
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  closeButton: {
    padding: 4,
  },

  // Form Styles
  formFieldContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  formInput: {
    fontSize: 16,
    color: "#1a1a1a",
  },
  datePlaceholder: {
    color: "#999",
    fontSize: 16,
  },
  dateText: {
    color: "#1a1a1a",
    fontSize: 16,
  },
  dateTouchableArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iosDatePicker: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
  },

  // Add Type Selector
  addTypeSelector: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  addTypeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  addTypeButtonActive: {
    backgroundColor: "#539DF3",
    borderColor: "#539DF3",
  },
  addTypeText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  addTypeTextActive: {
    color: "#fff",
  },
  addScroll: {
    maxHeight: 400,
    paddingVertical: 8,
  },

  // Filter Cards
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
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 16,
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

  // Buttons
  buttonRow: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 12,
    backgroundColor: "#fff",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  cancelBtnText: {
    fontWeight: "600",
    color: "#666",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
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
  resetBtnText: {
    fontWeight: "600",
    color: "#666",
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
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
  applyBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "Poppins_700Bold",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
  },
  emptyStateTitle: {
    marginTop: 16,
    fontFamily: "Poppins_500Medium",
    fontSize: 18,
    color: "#666",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#999",
    textAlign: "center",
    lineHeight: 20,
  },
  // Form Select
  selectLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    fontWeight: "500",
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  optionChipSelected: {
    backgroundColor: "#539DF3",
    borderColor: "#539DF3",
  },
  optionChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  optionChipTextSelected: {
    color: "#fff",
  },
  // Filter Actions
  filterActions: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 12,
    backgroundColor: "#fff",
  },
  // Info Text
  requiredNote: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    color: "#539DF3",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  detailExtra: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 10,
    padding: Platform.OS === "ios" ? 15 : 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  datePickerHeader: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 10,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  datePicker: {
    height: Platform.OS === "ios" ? 200 : undefined,
    backgroundColor: "#fff",
  },
  datePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  datePickerButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  datePickerButtonCancel: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  datePickerButtonConfirm: {
    backgroundColor: "#539DF3",
  },
  datePickerButtonTextCancel: {
    color: "#6c757d",
    fontWeight: "600",
  },
  datePickerButtonTextConfirm: {
    color: "#fff",
    fontWeight: "600",
  },
  androidCloseButton: {
    backgroundColor: "#539DF3",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  androidCloseButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e1e5e9",
    marginTop: 16,
    gap: 8,
  },
  refreshButtonText: {
    color: "#539DF3",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },
});
