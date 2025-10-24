import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { KeyboardAvoidingView, Keyboard, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import TendenciaStockChart from "../../components/TendenciaStockChart";

// Constantes
const API_BASE_URL = "http://172.20.10.11:3000";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface ProductoEdicion {
  nombre: string;
  marca: string;
  lote: string;
  existencia_actual: number;
  stock_minimo: number;
  id_estatus_producto: number;
  id_prioridad: number;
  id_tipo_producto: number;
  imagen: string;
  // Propiedades opcionales para diferentes tipos
  presentacion?: string | null;
  caducidad?: string | null;
  cantidad_ingresada_reactivo?: number;
  id_agk?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  rango_medicion?: string | null;
  resolucion?: string | null;
  intervalo_trabajo?: string | null;
  id_laboratorio?: number | null;
}

// Interfaces (sin cambios)
// ACTUALIZAR la interfaz Producto (al inicio del archivo)
interface Producto {
  id_producto: number;
  nombre: string;
  marca: string;
  lote: string;
  fecha_ingreso: string;
  existencia_actual: number;
  stock_minimo: number;
  imagen: string;
  id_tipo_producto: number;
  prioridad: string;
  tipo: string;
  estatus: string;
  id_estatus_producto?: number; // ✅ Hacer opcional
  id_prioridad?: number;
  presentacion?: string;
  caducidad?: string;
  id_agk?: string;
  modelo?: string;
  numero_serie?: string;
  rango_medicion?: string;
  resolucion?: string;
  intervalo_trabajo?: string;
  equipo_laboratorio_nombre?: string;
  equipo_laboratorio_ubicacion?: string;
  id_laboratorio?: number;
  cantidad_material?: number;
}

interface Documento {
  id_documento?: number;
  nombre: string;
  tipo: "certificado" | "hds";
  url: string;
  fecha_subida?: string;
  tamaño?: number;
  tipo_archivo?: string;
  nombre_archivo?: string;
}

interface MotivoBaja {
  id_motivo_baja: number;
  nombre_motivo: string;
}

interface OpcionSelect {
  value: string;
  label: string;
}

interface Movimiento {
  id_movimiento: number;
  fecha: string;
  cantidad: number;
  descripcion_adicional: string | null;
  tipo_movimiento: "Entrada" | "Baja" | "Termino";
  responsable: string;
  motivo_baja: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

// Función de ayuda para calcular la autonomía de un producto
function calcularDiferenciaFechas(inicio: string, fin: string): string {
  if (!inicio || !fin) return "N/A";

  try {
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    // Validar que las fechas sean válidas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
      return "N/A";
    }

    // ✅ CORREGIDO: Asegurar que son números
    const diffMs = fechaFin.getTime() - fechaInicio.getTime();

    // Si la diferencia es negativa, podría ser un error
    if (diffMs < 0) {
      console.warn("⚠️ Diferencia de fechas negativa:", {
        inicio,
        fin,
        diffMs,
      });
      return "N/A";
    }

    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMsRestante = diffMs - dias * (1000 * 60 * 60 * 24);
    const horas = Math.floor(diffMsRestante / (1000 * 60 * 60));
    const diffMsFinal = diffMsRestante - horas * (1000 * 60 * 60);
    const minutos = Math.floor(diffMsFinal / (1000 * 60));

    let resultado = "";
    if (dias > 0) resultado += `${dias} día(s) `;
    if (horas > 0) resultado += `${horas} hora(s) `;
    if (minutos > 0) resultado += `${minutos} min.`;

    return resultado.trim() || "Menos de un minuto";
  } catch (error) {
    console.error("❌ Error calculando diferencia de fechas:", error);
    return "N/A";
  }
}

// --- Funciones auxiliares para estatus ---
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

// Función para obtener color de estatus
const getEstatusColor = (producto: Producto): string => {
  switch (producto.id_estatus_producto) {
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

// Función para obtener texto de estatus mejorado
const getEstatusText = (producto: Producto): string => {
  return producto.estatus || "Indefinido";
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [motivosBaja, setMotivosBaja] = useState<MotivoBaja[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<"certificado" | "hds">(
    "certificado"
  );
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [uploading, setUploading] = useState(false);

  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  // Datos para la gráfica de tendencia de stock
  const [datosGrafica, setDatosGrafica] = useState<{ x: string; y: number }[]>(
    []
  );

  // Animaciones
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Opciones para selects
  const [opcionesPrioridad, setOpcionesPrioridad] = useState<OpcionSelect[]>(
    []
  );
  const [opcionesEstatus, setOpcionesEstatus] = useState<OpcionSelect[]>([]);
  const [opcionesLaboratorios, setOpcionesLaboratorios] = useState<
    OpcionSelect[]
  >([]);

  // Estados para el formulario de edición
  const [editForm, setEditForm] = useState({
    nombre: "",
    marca: "",
    lote: "",
    existencia_actual: "",
    stock_minimo: "",
    prioridad: "",
    estatus: "",
    id_estatus_producto: "",
    id_prioridad: "",
    presentacion: "",
    caducidad: "",
    id_agk: "",
    modelo: "",
    numero_serie: "",
    rango_medicion: "",
    resolucion: "",
    intervalo_trabajo: "",
    id_laboratorio: "",
  });

  // Estados para el formulario de reporte de salida
  const [reportForm, setReportForm] = useState({
    id_motivo_baja: "",
    cantidad: "1",
    descripcion_adicional: "",
  });

  // Función para procesar el historial y crear datos para la gráfica
  const procesarDatosParaGrafica = (movimientos: Movimiento[]) => {
    if (!movimientos || movimientos.length === 0) return [];

    const datos: { x: string; y: number }[] = [];
    let stockAcumulado = producto?.existencia_actual || 0;

    // Ordenar movimientos por fecha (más antiguo primero)
    const movimientosOrdenados = [...movimientos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    // Reconstruir stock histórico (empezando desde el final)
    for (let i = movimientosOrdenados.length - 1; i >= 0; i--) {
      const mov = movimientosOrdenados[i];

      if (mov.tipo_movimiento === "Entrada") {
        stockAcumulado -= mov.cantidad;
      } else {
        stockAcumulado += mov.cantidad;
      }

      // Solo agregar puntos significativos (cambios de stock)
      if (
        i === movimientosOrdenados.length - 1 ||
        datos[datos.length - 1]?.y !== stockAcumulado
      ) {
        datos.unshift({
          x: new Date(mov.fecha).toLocaleDateString("es-MX"),
          y: stockAcumulado,
        });
      }
    }

    return datos;
  };

  // Efecto de animación al cargar
  useEffect(() => {
    if (!loading && producto) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, producto]);

  // Función para formatear fecha
  const formatFecha = (fecha: string) => {
    if (!fecha) return "N/A";
    return fecha.split("T")[0];
  };

  // Cargar opciones para selects
  const fetchOpcionesSelect = async () => {
    try {
      // Cargar Prioridades
      try {
        const prioridadesRes = await fetch(
          `${API_BASE_URL}/api/productos/prioridades/list`
        );
        if (prioridadesRes.ok) {
          const prioridadesData = await prioridadesRes.json();
          if (Array.isArray(prioridadesData) && prioridadesData.length > 0) {
            const opciones = prioridadesData.map((p: any) => ({
              value: p.id_prioridad?.toString(),
              label: p.nombre_prioridad || p.prioridad || "Sin nombre",
            }));
            setOpcionesPrioridad(opciones);
          } else {
            setOpcionesPrioridad([
              { value: "1", label: "Alta" },
              { value: "2", label: "Media" },
              { value: "3", label: "Baja" },
            ]);
          }
        } else {
          throw new Error(`HTTP ${prioridadesRes.status}`);
        }
      } catch (error) {
        console.error("❌ Error cargando prioridades:", error);
        setOpcionesPrioridad([
          { value: "1", label: "Alta" },
          { value: "2", label: "Media" },
          { value: "3", label: "Baja" },
        ]);
      }

      // Cargar Estatus
      try {
        const estatusRes = await fetch(
          `${API_BASE_URL}/api/productos/estatus/list`
        );
        if (estatusRes.ok) {
          const estatusData = await estatusRes.json();
          if (Array.isArray(estatusData) && estatusData.length > 0) {
            const opciones = estatusData.map((e: any) => ({
              value: e.id_estatus_producto?.toString(),
              label: e.nombre_estatus || e.estatus || "Sin nombre",
            }));
            setOpcionesEstatus(opciones);
          } else {
            setOpcionesEstatus([
              { value: "1", label: "Activo" },
              { value: "2", label: "Inactivo" },
            ]);
          }
        } else {
          throw new Error(`HTTP ${estatusRes.status}`);
        }
      } catch (error) {
        console.error("❌ Error cargando estatus:", error);
        setOpcionesEstatus([
          { value: "1", label: "Activo" },
          { value: "2", label: "Inactivo" },
        ]);
      }

      // Cargar Laboratorios
      try {
        const laboratoriosRes = await fetch(
          `${API_BASE_URL}/api/productos/laboratorios/list`
        );
        if (laboratoriosRes.ok) {
          const laboratoriosData = await laboratoriosRes.json();
          if (Array.isArray(laboratoriosData) && laboratoriosData.length > 0) {
            const opciones = laboratoriosData.map((l: any) => ({
              value: l.id_laboratorio?.toString(),
              label: `${l.nombre || "Lab"} - ${l.ubicacion || "Ubicación"}`,
            }));
            setOpcionesLaboratorios(opciones);
          } else {
            setOpcionesLaboratorios([
              { value: "1", label: "Laboratorio Central - Planta Principal" },
            ]);
          }
        } else {
          throw new Error(`HTTP ${laboratoriosRes.status}`);
        }
      } catch (error) {
        console.error("❌ Error cargando laboratorios:", error);
        setOpcionesLaboratorios([
          { value: "1", label: "Laboratorio Central - Planta Principal" },
        ]);
      }
    } catch (error) {
      console.error("❌ Error general cargando opciones:", error);
    }
  };

  // Cargar motivos de salida para el reporte
  const fetchMotivosBaja = async () => {
    try {
      setLoadingMovimientos(true);
      const res = await fetch(`${API_BASE_URL}/api/movimientos/motivos-baja`);
      const data = await res.json();

      // ✅ DEBUG: VER QUÉ MOTIVOS TRAE EL BACKEND
      console.log("📋 Motivos de baja cargados:", data);

      setMotivosBaja(data);
    } catch (error) {
      console.error("❌ Error cargando motivos de salida:", error);
      Alert.alert("Error", "No se pudo cargar los motivos de salida");
    } finally {
      setLoadingMovimientos(false);
    }
  };

  // Abrir modal de reporte de salida
  const handleOpenReportModal = () => {
    fetchMotivosBaja();
    setReportModalVisible(true);
  };

  // Cargar documentos - VERSIÓN COMPATIBLE CON TU BACKEND
  const fetchDocumentos = async () => {
    if (!producto) return;

    try {
      console.log(
        "📂 Cargando documentos para producto:",
        producto.id_producto
      );

      const res = await fetch(
        `${API_BASE_URL}/api/documentos/producto/${producto.id_producto}`
      );

      if (res.ok) {
        const data = await res.json();
        console.log("📄 Documentos cargados:", data);

        // Transformar los datos del backend
        const documentosTransformados: Documento[] = data.map((doc: any) => ({
          id_documento: doc.id_documento,
          nombre: doc.nombre_archivo,
          tipo: doc.id_tipo_documento === 1 ? "certificado" : "hds",
          url: `${API_BASE_URL}/uploads/${doc.nombre_archivo}`,
          fecha_subida: doc.fecha_subida,
          id_tipo_documento: doc.id_tipo_documento,
          nombre_archivo: doc.nombre_archivo,
        }));

        setDocumentos(documentosTransformados);
      } else {
        console.warn(
          "⚠️ No se pudieron cargar documentos, status:",
          res.status
        );
        setDocumentos([]);
      }
    } catch (error) {
      console.error("❌ Error cargando documentos:", error);
      setDocumentos([]);
    }
  };

  // SUBIR DOCUMENTO - VERSIÓN MEJORADA (SOLO PDFs)
  const handleUploadDocument = async (tipo: "certificado" | "hds") => {
    if (!producto) {
      Alert.alert("Error", "No hay producto seleccionado");
      return;
    }

    try {
      setUploading(true);
      console.log("📤 Iniciando subida de documento...");

      // ✅ SOLO PERMITIR PDFs
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf", // SOLO PDF
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log("📄 Resultado de DocumentPicker:", result);

      if (result.canceled) {
        console.log("👤 Usuario canceló la selección");
        return;
      }

      const file = result.assets[0];
      console.log("📎 Archivo seleccionado:", file);

      // Validar que sea PDF
      if (file.mimeType !== "application/pdf") {
        Alert.alert("Error", "Solo se permiten archivos PDF");
        return;
      }

      // Validar tamaño (10MB máximo)
      if (file.size && file.size > 10 * 1024 * 1024) {
        Alert.alert("Error", "El archivo es demasiado grande. Máximo 10MB.");
        return;
      }

      // Crear FormData
      const formData = new FormData();
      const fileObject = {
        uri: file.uri,
        name: file.name || `documento_${Date.now()}.pdf`,
        type: "application/pdf", // Forzar tipo PDF
      };

      formData.append("archivo", fileObject as any);

      // Mapear tipo a id_tipo_documento
      const idTipoDocumento = tipo === "certificado" ? 1 : 2;

      // URL de subida
      const uploadUrl = `${API_BASE_URL}/api/documentos/upload/${producto.id_producto}/${idTipoDocumento}`;

      console.log("📡 Enviando documento al servidor...", uploadUrl);

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      console.log("📡 Respuesta del servidor:", response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log("✅ Documento subido exitosamente:", responseData);
        Alert.alert("Éxito", "Documento PDF subido correctamente");
        await fetchDocumentos(); // Recargar lista
        setDocumentModalVisible(false);
      } else {
        const errorText = await response.text();
        console.error("❌ Error del servidor:", response.status, errorText);
        Alert.alert("Error", `Error al subir documento: ${response.status}`);
      }
    } catch (error: any) {
      console.error("❌ Error subiendo documento:", error);
      Alert.alert(
        "Error",
        "No se pudo subir el documento. Verifica tu conexión."
      );
    } finally {
      setUploading(false);
    }
  };

  // VER DOCUMENTO - VERSIÓN MEJORADA
  const handleViewDocument = async (documento: Documento) => {
    try {
      console.log("👀 Abriendo documento:", documento);

      if (!documento.url) {
        Alert.alert("Error", "El documento no tiene URL válida");
        return;
      }

      // Verificar que la URL sea accesible
      const testResponse = await fetch(documento.url, { method: "HEAD" });
      if (!testResponse.ok) {
        Alert.alert(
          "Error",
          "No se puede acceder al documento en este momento"
        );
        return;
      }

      console.log("🌐 Abriendo URL:", documento.url);
      await WebBrowser.openBrowserAsync(documento.url, {
        toolbarColor: "#000000ff",
        secondaryToolbarColor: "#ffffff",
        controlsColor: "#539DF3",
        dismissButtonStyle: "close",
      });
    } catch (error) {
      console.error("❌ Error abriendo documento:", error);
      Alert.alert(
        "Error",
        "No se pudo abrir el documento. Verifica tu conexión."
      );
    }
  };

  // ABRIR MODAL DE GESTIÓN DE DOCUMENTOS - CON CARGA AUTOMÁTICA
  const handleOpenDocumentModal = async (tipo: "certificado" | "hds") => {
    setSelectedDocType(tipo);
    setDocumentModalVisible(true);
    if (producto) {
      await fetchDocumentos();
    }
  };

  // Guardar cambios del producto - VERSIÓN CORREGIDA
const handleSaveEdit = async () => {
  if (!producto) return;

  try {
    // PREPARAR DATOS BÁSICOS CON CONVERSIÓN EXPLÍCITA
    const datosBasicos: ProductoEdicion = {
      nombre: editForm.nombre,
      marca: editForm.marca,
      lote: editForm.lote,
      existencia_actual: parseInt(editForm.existencia_actual) || 0,
      stock_minimo: parseInt(editForm.stock_minimo) || 0,
      id_estatus_producto: parseInt(editForm.id_estatus_producto) || 1,
      id_prioridad: parseInt(editForm.id_prioridad) || 2,
      id_tipo_producto: producto.id_tipo_producto,
      imagen: producto.imagen,
    };

    let datosCompletos: ProductoEdicion = { ...datosBasicos };

    if (producto.id_tipo_producto === 1) {
      // REACTIVO
      let caducidadParaEnviar = editForm.caducidad;
      if (caducidadParaEnviar) {
        if (caducidadParaEnviar.includes("T")) {
          caducidadParaEnviar = caducidadParaEnviar.split("T")[0];
        }
        if (!caducidadParaEnviar.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.error("❌ Formato de fecha inválido:", caducidadParaEnviar);
          Alert.alert("Error", "Formato de fecha inválido. Use YYYY-MM-DD");
          return;
        }
      }

      datosCompletos = {
        ...datosCompletos,
        presentacion: editForm.presentacion || null,
        caducidad: caducidadParaEnviar || null,
        cantidad_ingresada_reactivo: parseInt(editForm.existencia_actual) || 0,
      };
    } else if (producto.id_tipo_producto === 2) {
      datosCompletos = {
        ...datosCompletos,
        id_agk: editForm.id_agk || null,
        modelo: editForm.modelo || null,
        numero_serie: editForm.numero_serie || null,
        rango_medicion: editForm.rango_medicion || null,
        resolucion: editForm.resolucion || null,
        intervalo_trabajo: editForm.intervalo_trabajo || null,
        id_laboratorio: editForm.id_laboratorio
          ? parseInt(editForm.id_laboratorio)
          : null,
      };

      console.log("🔍 DEBUG FRONTEND - Datos de equipo a enviar:", {
        id_agk: editForm.id_agk,
        modelo: editForm.modelo,
        numero_serie: editForm.numero_serie,
        rango_medicion: editForm.rango_medicion,
        resolucion: editForm.resolucion,
        intervalo_trabajo: editForm.intervalo_trabajo,
        id_laboratorio: editForm.id_laboratorio,
      });
    }

    console.log("🔄 ENVIANDO DATOS COMPLETOS AL BACKEND:", datosCompletos);

    const response = await fetch(
      `${API_BASE_URL}/api/productos/${producto.id_producto}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datosCompletos),
      }
    );

    if (response.ok) {
      Alert.alert("Éxito", "Producto actualizado correctamente");
      setEditModalVisible(false);
      await refreshProductData();
    } else {
      const errorData = await response.json();
      console.error("❌ Error del backend:", errorData);
      Alert.alert("Error", errorData.error || "No se pudo actualizar");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar el producto";
    Alert.alert("Error", errorMessage);
  }
};

  // Reportar salida - VERSIÓN ACTUALIZADA CON NUEVAS VALIDACIONES DEL BACKEND
  const handleReportBaja = async () => {
    if (!producto || !reportForm.id_motivo_baja) {
      return Alert.alert("Error", "Debes seleccionar un motivo.");
    }

    const motivo = parseInt(reportForm.id_motivo_baja);

    // ✅ NUEVA VALIDACIÓN: No permitir acciones que requieran stock si no hay disponible
    if (producto.existencia_actual <= 0 && motivo !== 4) {
      return Alert.alert(
        "Sin stock disponible",
        "No se puede realizar esta acción porque el producto no tiene stock disponible."
      );
    }

    // ✅ VALIDACIONES CON LOS IDs CORRECTOS DE LA BD
    if (motivo === 5 && producto.id_estatus_producto !== 5) {
      return Alert.alert(
        "No se puede finalizar uso",
        `Solo puedes finalizar uso después de haber INICIADO USO.`
      );
    }

if (motivo === 1 && producto.id_estatus_producto && ![1, 3, 8].includes(producto.id_estatus_producto)) {
  return Alert.alert(
    "No se puede iniciar uso",
    `Solo puedes iniciar uso cuando el producto está Disponible, Bajo stock o Próximo a caducar.`
  );
}

    if (motivo === 2 && !reportForm.descripcion_adicional?.trim()) {
      return Alert.alert(
        "Descripción Requerida",
        "La descripción es obligatoria para reportar una incidencia."
      );
    }

    if (motivo === 4) {
      if (!reportForm.descripcion_adicional?.trim()) {
        return Alert.alert(
          "Descripción Requerida",
          "Para dar de baja, la descripción es obligatoria."
        );
      }

      // ✅ NUEVA VALIDACIÓN: No permitir baja si no hay stock
      if (producto.existencia_actual <= 0) {
        return Alert.alert(
          "No se puede dar de baja",
          "No hay stock disponible."
        );
      }

      Alert.alert(
        "⚠️ Confirmar Baja Completa",
        `Se eliminarán las (${producto.existencia_actual} unidades). Esta acción es irreversible.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar Baja",
            style: "destructive",
            onPress: () => executeBaja(),
          },
        ]
      );
      return;
    }

    // ✅ VALIDACIÓN ADICIONAL: No permitir incidencia si no hay stock suficiente
    if (
      motivo === 2 &&
      producto.existencia_actual < parseInt(reportForm.cantidad || "1")
    ) {
      return Alert.alert(
        "Stock insuficiente",
        `No hay stock suficiente. Stock actual: ${producto.existencia_actual} unidades.`
      );
    }

    // Confirmación para otros motivos
    const motivoText = motivosBaja.find(
      (m) => m.id_motivo_baja === motivo
    )?.nombre_motivo;

    Alert.alert(
      "Confirmar Reporte",
      `¿Estás seguro de reportar "${motivoText}"?\n\n` +
        `Producto: ${producto.nombre}\n` +
        `Estatus actual: ${producto.estatus}\n` +
        `Stock disponible: ${producto.existencia_actual} unidades`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Confirmar", onPress: () => executeSalida() },
      ]
    );
  };

  // Nueva función para manejar el endpoint /bajas
  const executeBaja = async () => {
    if (!producto) return;

    try {
      setLoadingMovimientos(true);

      const response = await fetch(`${API_BASE_URL}/api/movimientos/bajas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_producto: producto.id_producto,
          id_usuario: 1,
          descripcion_adicional: reportForm.descripcion_adicional,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert("Éxito", "Baja registrada correctamente");

        // ✅ ACTUALIZAR INMEDIATAMENTE
        setReportModalVisible(false);
        setReportForm({
          id_motivo_baja: "",
          cantidad: "1",
          descripcion_adicional: "",
        });

        // Recargar todos los datos
        await refreshProductData();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.error || "No se pudo registrar la baja");
      }
    } catch (error) {
      console.error("Error reportando baja:", error);
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setLoadingMovimientos(false);
    }
  };

  // Nueva función para manejar el endpoint /salidas
  const executeSalida = async () => {
    if (!producto) return;

    try {
      setLoadingMovimientos(true);

      console.log(
        "🔄 Enviando al backend - ID Motivo:",
        reportForm.id_motivo_baja
      );

      const response = await fetch(`${API_BASE_URL}/api/movimientos/salidas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_producto: producto.id_producto,
          id_usuario: 1,
          cantidad: parseInt(reportForm.cantidad) || 1,
          id_motivo_baja: parseInt(reportForm.id_motivo_baja), // ✅ ENVIAR DIRECTAMENTE
          descripcion_adicional: reportForm.descripcion_adicional || null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        Alert.alert("Éxito", "Movimiento reportado correctamente");

        setReportModalVisible(false);
        setReportForm({
          id_motivo_baja: "",
          cantidad: "1",
          descripcion_adicional: "",
        });
        await refreshProductData();
      } else {
        const errorData = await response.json();
        Alert.alert(
          "Error",
          errorData.error || "No se pudo reportar la salida"
        );
      }
    } catch (error) {
      console.error("❌ Error reportando salida:", error);
      Alert.alert("Error", "No se pudo conectar con el servidor");
    } finally {
      setLoadingMovimientos(false);
    }
  };

  // Editar imagen del producto - NUEVO MÉTODO
  const handleEditImage = async () => {
    if (!producto) return;

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permiso requerido",
          "Debes autorizar el acceso a la galería."
        );
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.7,
      });

      if (pickerResult.canceled) return;

      const imageAsset = pickerResult.assets[0];

      const formData = new FormData();
      formData.append("imagen", {
        uri: imageAsset.uri,
        type: "image/jpeg",
        name: `producto_${producto.id_producto}.jpg`,
      } as any);

      console.log("🔄 Subiendo imagen...");

      const response = await fetch(
        `${API_BASE_URL}/api/productos/${producto.id_producto}/imagen`,
        {
          method: "POST", // ← CAMBIADO A POST
          body: formData,
        }
      );

      console.log("📡 Status:", response.status);

      if (response.ok) {
        const result = await response.json();
        Alert.alert("Éxito", "Imagen actualizada correctamente");
        await refreshProductData();
      } else {
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);

        if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
          throw new Error(
            "Endpoint no encontrado. Verifica la ruta en el servidor."
          );
        } else {
          throw new Error(
            `Error ${response.status}: No se pudo actualizar la imagen`
          );
        }
      }
    } catch (error: any) {
      console.error("❌ Error:", error);
      Alert.alert("Error", error.message || "No se pudo subir la imagen");
    } finally {
      setLoading(false);
    }
  };

  const refreshProductData = async () => {
    if (!id) return;

    setLoading(true);
    setCargandoHistorial(true);

    try {
      console.log("🔄🔄🔄 RECARGANDO DATOS - INICIO");

      // Hacer peticiones en paralelo
      const [productResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/productos/${id}?t=${Date.now()}`, {
          // ✅ Agregar timestamp
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }),
        fetch(
          `${API_BASE_URL}/api/movimientos/historial/${id}?t=${Date.now()}`,
          {
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          }
        ),
      ]);

      if (!productResponse.ok) throw new Error("Error al cargar producto");
      if (!historyResponse.ok) throw new Error("Error al cargar historial");

      const productData = await productResponse.json();
      const historyData = await historyResponse.json();

      // ✅ DEBUG CRÍTICO: Ver qué datos llegan del backend
      console.log("📥 DATOS RECIBIDOS DEL BACKEND:", {
        id: productData.id_producto,
        nombre: productData.nombre,
        caducidad: productData.caducidad,
        estatus: productData.estatus,
        id_estatus: productData.id_estatus_producto,
      });

      // Actualizar estados
      setProducto(productData);
      setHistorial(historyData);

      // Actualizar datos para gráfica
      const datosGraficaNuevos = procesarDatosParaGrafica(historyData);
      setDatosGrafica(datosGraficaNuevos);

      // Actualizar formulario de edición
      if (productData) {
        const editFormData: any = {
          nombre: productData.nombre || "",
          marca: productData.marca || "",
          lote: productData.lote || "",
          existencia_actual: productData.existencia_actual?.toString() || "",
          stock_minimo: productData.stock_minimo?.toString() || "",
          prioridad: productData.prioridad || "",
          estatus: productData.estatus || "",
          id_estatus_producto:
            productData.id_estatus_producto?.toString() || "",
          id_prioridad: productData.id_prioridad?.toString() || "",
          presentacion: productData.presentacion || "",
          caducidad: productData.caducidad
            ? productData.caducidad.split("T")[0]
            : "",
        };

        // ✅ AGREGAR DATOS ESPECÍFICOS DE EQUIPO
        if (productData.id_tipo_producto === 2) {
          editFormData.id_agk = productData.id_agk || "";
          editFormData.modelo = productData.modelo || "";
          editFormData.numero_serie = productData.numero_serie || "";
          editFormData.rango_medicion = productData.rango_medicion || "";
          editFormData.resolucion = productData.resolucion || "";
          editFormData.intervalo_trabajo = productData.intervalo_trabajo || "";
          editFormData.id_laboratorio =
            productData.id_laboratorio?.toString() || "";
        }

        console.log("📝 FORMULARIO ACTUALIZADO:", editFormData);
        setEditForm(editFormData);
      }

      console.log("✅✅✅ RECARGANDO DATOS - COMPLETADO");
    } catch (error) {
      console.error("❌ Error recargando datos:", error);
      Alert.alert("Error", "No se pudo actualizar la información.");
    } finally {
      setLoading(false);
      setCargandoHistorial(false);
    }
  };

  // useEffect para cargar el producto
  useEffect(() => {
    fetchOpcionesSelect(); // Esto solo se necesita una vez
    refreshProductData(); // Carga todos los datos la primera vez
  }, [id]);

  // AÑADE este useEffect - después de los demás useEffect:
  useEffect(() => {
    if (historial.length > 0 && producto) {
      const datos = procesarDatosParaGrafica(historial);
      setDatosGrafica(datos);
    }
  }, [historial, producto]);

  // Render loading
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#539DF3" />
        <Text style={{ marginTop: 10 }}>Cargando producto...</Text>
      </View>
    );
  }

  // Render si no hay producto
  if (!producto) {
    return (
      <View style={styles.center}>
        <Text>No se encontró el producto</Text>
      </View>
    );
  }

  const statusColor = getEstatusColor(producto);
  const statusText = getEstatusText(producto);

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        style={[
          styles.scrollView,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* === NUEVO HEADER REDISEÑADO === */}
        <View style={styles.header}>
          <Image
            source={
              producto.imagen
                ? { uri: producto.imagen }
                : require("../../assets/images/placeholder.png")
            }
            style={styles.productImage}
          />
          <TouchableOpacity
            style={styles.editImageButton}
            onPress={handleEditImage}
          >
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.title}>{producto.nombre}</Text>
          <Text style={styles.subtitle}>{producto.tipo}</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: getEstatusColor(producto) },
              ]}
            />
            <Text style={styles.statusText}>{getEstatusText(producto)}</Text>
          </View>
        </View>

        {/* === NUEVOS BOTONES DE ACCIÓN INTEGRADOS === */}
        <View style={styles.mainActionsContainer}>
          <TouchableOpacity
            style={[styles.mainButton, styles.secondaryButton]}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color="#000000ff" />
            <Text style={[styles.mainButtonText, styles.secondaryButtonText]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mainButton, styles.primaryButton]}
            onPress={handleOpenReportModal}
          >
            <Ionicons name="exit-outline" size={20} color="white" />
            <Text style={styles.mainButtonText}>Reportar</Text>
          </TouchableOpacity>
        </View>

        {/* Advertencia de caducidad (movida hacia arriba para mayor visibilidad) */}
        {producto.id_tipo_producto === 1 &&
          producto.caducidad &&
          (() => {
            const dias = calcularDiasHastaCaducidad(producto.caducidad);
            console.log("📅 Debug caducidad:", {
              caducidad: producto.caducidad,
              dias: dias,
              estatus: producto.estatus,
            });
            return dias !== null && dias <= 15 ? (
              <View
                style={[
                  styles.warningCard,
                  { backgroundColor: dias < 0 ? "#FEF2F2" : "#FFFBEB" },
                ]}
              >
                <Ionicons
                  name={dias < 0 ? "alert-circle" : "warning"}
                  size={24}
                  color={dias < 0 ? "#DC2626" : "#D97706"}
                />
                <View style={styles.warningTextContainer}>
                  <Text
                    style={[
                      styles.warningTitle,
                      { color: dias < 0 ? "#DC2626" : "#D97706" },
                    ]}
                  >
                    {dias < 0 ? "PRODUCTO CADUCADO" : "PRÓXIMO A CADUCAR"}
                  </Text>
                  <Text style={styles.warningMessage}>
                    {dias < 0
                      ? "Este producto ha caducado"
                      : dias === 0
                      ? "¡Caduca hoy!"
                      : `Caduca en ${dias} días`}
                  </Text>
                </View>
              </View>
            ) : null;
          })()}

        {/* Tarjeta de información principal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color="#000000ff"
            />
            <Text style={styles.cardTitle}>Información General</Text>
          </View>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Marca</Text>
              <Text style={styles.infoValue}>{producto.marca}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Lote</Text>
              <Text style={styles.infoValue}>{producto.lote || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Fecha Ingreso</Text>
              <Text style={styles.infoValue}>
                {formatFecha(producto.fecha_ingreso)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Prioridad</Text>
              <Text style={styles.infoValue}>{producto.prioridad}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Stock Mínimo</Text>
              <Text style={styles.infoValue}>
                {producto.stock_minimo} unidades
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Stock Actual</Text>
              <Text style={[styles.infoValue, styles.stockValue]}>
                {producto.existencia_actual} unidades
              </Text>
            </View>
          </View>
        </View>

        {/* Detalles específicos por tipo */}
        {producto.id_tipo_producto === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="flask-outline" size={24} color="#000000ff" />
              <Text style={styles.cardTitle}>Detalles del Reactivo</Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Presentación</Text>
                <Text style={styles.detailValue}>
                  {producto.presentacion || "N/A"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Caducidad</Text>
                <Text style={styles.detailValue}>
                  {producto.caducidad ? formatFecha(producto.caducidad) : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {producto.id_tipo_producto === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="hardware-chip-outline"
                size={24}
                color="#000000ff"
              />
              <Text style={styles.cardTitle}>Detalles del Equipo</Text>
            </View>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>ID AGK</Text>
                <Text style={styles.detailValue}>
                  {producto.id_agk || "N/A"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Modelo</Text>
                <Text style={styles.detailValue}>
                  {producto.modelo || "N/A"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Número de Serie</Text>
                <Text style={styles.detailValue}>
                  {producto.numero_serie || "N/A"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Rango de Medición</Text>
                <Text style={styles.detailValue}>
                  {producto.rango_medicion || "N/A"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Resolución</Text>
                <Text style={styles.detailValue}>
                  {producto.resolucion || "N/A"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Laboratorio</Text>
                <Text
                  style={[styles.detailValue, styles.laboratorioValue]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {producto.equipo_laboratorio_nombre || "N/A"} -{" "}
                  {producto.equipo_laboratorio_ubicacion || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* === NUEVA SECCIÓN DE DOCUMENTOS SIMPLIFICADA === */}
        {producto.id_tipo_producto === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="folder-open-outline"
                size={24}
                color="#000000ff"
              />
              <Text style={styles.cardTitle}>Archivos</Text>
            </View>
            <TouchableOpacity
              style={styles.documentLink}
              onPress={() => handleOpenDocumentModal("certificado")}
            >
              <Ionicons
                name="document-attach-outline"
                size={22}
                color="#1E293B"
              />
              <Text style={styles.documentLinkText}>Certificados</Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.documentLink}
              onPress={() => handleOpenDocumentModal("hds")}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#1E293B"
              />
              <Text style={styles.documentLinkText}>
                Hojas de Seguridad (HDS)
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        )}

        {/* Historial de movimientos */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shuffle" size={24} color="#000000ff" />
            <Text style={styles.cardTitle}>Control de Movimientos</Text>
          </View>
          {cargandoHistorial ? (
            <ActivityIndicator
              style={{ marginVertical: 20 }}
              size="small"
              color="#4F46E5"
            />
          ) : historial.length > 0 ? (
            <ScrollView
              style={styles.historialScrollContainer}
              nestedScrollEnabled={true}
            >
              {historial.map((mov) => (
                <View key={mov.id_movimiento} style={styles.historialItem}>
                  <View style={styles.historialIcon}>
                    <Ionicons
                      name={
                        mov.tipo_movimiento === "Entrada"
                          ? "archive-outline"
                          : mov.motivo_baja === "Iniciar uso"
                          ? "play-outline"
                          : mov.motivo_baja === "Finalizar uso"
                          ? "stop-outline"
                          : mov.motivo_baja === "Incidencia"
                          ? "alert-outline"
                          : mov.motivo_baja === "Baja"
                          ? "trending-down-outline"
                          : "exit-outline"
                      }
                      size={24}
                      color={
                        mov.tipo_movimiento === "Entrada"
                          ? "#16A34A"
                          : mov.motivo_baja === "Iniciar uso"
                          ? "#3a82edff"
                          : mov.motivo_baja === "Finalizar uso"
                          ? "#DC2626"
                          : mov.motivo_baja === "Incidencia"
                          ? "#F59E0B"
                          : mov.motivo_baja === "Baja"
                          ? "#ff2b2bff"
                          : "#6B7280"
                      }
                    />
                  </View>
                  <View style={styles.historialContent}>
                    <Text style={styles.historialTitle}>
                      {mov.tipo_movimiento === "Entrada"
                        ? "Entrada"
                        : mov.motivo_baja || mov.tipo_movimiento}{" "}
                      ({mov.cantidad} Uds.)
                    </Text>
                    <Text style={styles.historialSubtitle}>
                      {new Date(mov.fecha).toLocaleString("es-MX")} por{" "}
                      {mov.responsable}
                    </Text>

                    {/* ✅ MEJORADO: Mostrar duración para Finalizar uso con las nuevas fechas del backend */}
                    {mov.motivo_baja === "Finalizar uso" &&
                      mov.fecha_inicio &&
                      mov.fecha_fin && (
                        <Text style={styles.historialDescription}>
                          ⏱️ Duración de uso:{" "}
                          {calcularDiferenciaFechas(
                            mov.fecha_inicio,
                            mov.fecha_fin
                          )}
                        </Text>
                      )}

                    {/* ✅ Mostrar nota para TODOS los movimientos que tengan descripción */}
                    {mov.descripcion_adicional && (
                      <Text style={styles.historialDescription}>
                        📝 Nota: {mov.descripcion_adicional}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noHistorialText}>
              No hay movimientos registrados.
            </Text>
          )}
        </View>

        {/* Gráfica de tendencia */}
        {producto.id_tipo_producto === 1 && datosGrafica.length > 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up" size={24} color="#000000ff" />
              <Text style={styles.cardTitle}>Tendencia de Stock</Text>
            </View>
            <TendenciaStockChart
              datos={datosGrafica}
              titulo={`Stock histórico - ${producto.nombre}`}
            />
          </View>
        )}
      </Animated.ScrollView>

      {/* Modal de Documentos */}
      <Modal
        visible={documentModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={["#87bcf8ff", "#539DF3"]}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>
                {selectedDocType === "certificado"
                  ? "Certificados"
                  : "Hoja de seguridad (HDS)"}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setDocumentModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalScroll}>
              {documentos.filter((doc) => doc.tipo === selectedDocType)
                .length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-outline" size={64} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>No hay documentos</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Presiona "Subir Nuevo" para agregar un documento PDF
                  </Text>
                </View>
              ) : (
                documentos
                  .filter((doc) => doc.tipo === selectedDocType)
                  .map((doc, index) => (
                    <TouchableOpacity
                      key={doc.id_documento || `doc-${index}`}
                      style={styles.docItem}
                      onPress={() => handleViewDocument(doc)}
                    >
                      <View style={styles.docIconContainer}>
                        <Ionicons
                          name="document-text-outline"
                          size={24}
                          color="#000000ff"
                        />
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.docName} numberOfLines={1}>
                          {doc.nombre}
                        </Text>
                        <View style={styles.docMeta}>
                          <Text style={styles.docMetaText}>PDF</Text>
                          {doc.fecha_subida && (
                            <Text style={styles.docDate}>
                              {new Date(doc.fecha_subida).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#CBD5E1"
                      />
                    </TouchableOpacity>
                  ))
              )}

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => handleUploadDocument(selectedDocType)}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="black" />
                    <Text style={styles.uploadButtonText}>
                      Subir Nuevo{" "}
                      {selectedDocType === "certificado"
                        ? "Certificado"
                        : "HDS"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.formatInfo}>
                <Text style={styles.formatInfoText}>
                  Solo se permiten archivos PDF (máx. 10MB)
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Edición */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
      >
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
              <LinearGradient
                colors={["#87bcf8ff", "#539DF3"]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>Editar Producto</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* El contenido del formulario no cambia, pero heredará los nuevos estilos de input, label, etc. */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionTitle}>Información General</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nombre del Producto</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.nombre}
                      onChangeText={(text) =>
                        setEditForm({ ...editForm, nombre: text })
                      }
                      placeholder="Ingresa el nombre del producto"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Marca</Text>
                    <TextInput
                      style={styles.input}
                      value={editForm.marca}
                      onChangeText={(text) =>
                        setEditForm({ ...editForm, marca: text })
                      }
                      placeholder="Ingresa la marca"
                    />
                  </View>

                  {(producto.id_tipo_producto === 1 ||
                    producto.id_tipo_producto === 3) && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Lote</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.lote}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, lote: text })
                        }
                        placeholder="Ingresa el número de lote"
                      />
                    </View>
                  )}

                  <View style={styles.rowInputs}>
                    <View
                      style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}
                    >
                      <Text style={styles.label}>Stock Actual</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.existencia_actual}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, existencia_actual: text })
                        }
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>

                    <View
                      style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}
                    >
                      <Text style={styles.label}>Stock Mínimo</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.stock_minimo}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, stock_minimo: text })
                        }
                        placeholder="0"
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Prioridad</Text>
                    <View style={styles.inlineSelectOptions}>
                      {opcionesPrioridad.map((opcion) => (
                        <TouchableOpacity
                          key={opcion.value}
                          style={[
                            styles.selectOption,
                            editForm.id_prioridad === opcion.value &&
                              styles.selectOptionActive,
                          ]}
                          onPress={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              id_prioridad: opcion.value,
                              prioridad: opcion.label,
                            }));
                          }}
                        >
                          <Text
                            style={[
                              styles.selectOptionText,
                              editForm.id_prioridad === opcion.value &&
                                styles.selectOptionTextActive,
                            ]}
                          >
                            {opcion.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Estatus</Text>
                    <View style={styles.inlineSelectOptions}>
                      {opcionesEstatus.map((opcion) => (
                        <TouchableOpacity
                          key={opcion.value}
                          style={[
                            styles.selectOption,
                            editForm.id_estatus_producto === opcion.value &&
                              styles.selectOptionActive,
                          ]}
                          onPress={() => {
                            setEditForm((prev) => ({
                              ...prev,
                              id_estatus_producto: opcion.value,
                              estatus: opcion.label,
                            }));
                          }}
                        >
                          <Text
                            style={[
                              styles.selectOptionText,
                              editForm.id_estatus_producto === opcion.value &&
                                styles.selectOptionTextActive,
                            ]}
                          >
                            {opcion.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Campos específicos por tipo */}
                {producto.id_tipo_producto === 1 && (
                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>
                      Detalles del Reactivo
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Presentación</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.presentacion}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, presentacion: text })
                        }
                        placeholder="Ej: 500ml, 1kg, 100 unidades"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Caducidad</Text>
                      <TextInput
                        style={styles.input}
                        value={
                          editForm.caducidad
                            ? editForm.caducidad.split("T")[0]
                            : ""
                        }
                        onChangeText={(text) => {
                          console.log("📅 Fecha cambiada:", text);
                          setEditForm({ ...editForm, caducidad: text });
                        }}
                        placeholder="YYYY-MM-DD"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                )}

                {producto.id_tipo_producto === 2 && (
                  <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Detalles del Equipo</Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>ID AGK</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.id_agk}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, id_agk: text })
                        }
                        placeholder="Ingresa el ID AGK"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Modelo</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.modelo}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, modelo: text })
                        }
                        placeholder="Ingresa el modelo"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Número de Serie</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.numero_serie}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, numero_serie: text })
                        }
                        placeholder="Ingresa el número de serie"
                      />
                    </View>

                    <View style={styles.rowInputs}>
                      <View
                        style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}
                      >
                        <Text style={styles.label}>Rango de Medición</Text>
                        <TextInput
                          style={styles.input}
                          value={editForm.rango_medicion}
                          onChangeText={(text) =>
                            setEditForm({ ...editForm, rango_medicion: text })
                          }
                          placeholder="Ej: 0-100°C"
                        />
                      </View>

                      <View
                        style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}
                      >
                        <Text style={styles.label}>Resolución</Text>
                        <TextInput
                          style={styles.input}
                          value={editForm.resolucion}
                          onChangeText={(text) =>
                            setEditForm({ ...editForm, resolucion: text })
                          }
                          placeholder="Ej: 0.1°C"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Intervalo de Trabajo</Text>
                      <TextInput
                        style={styles.input}
                        value={editForm.intervalo_trabajo}
                        onChangeText={(text) =>
                          setEditForm({ ...editForm, intervalo_trabajo: text })
                        }
                        placeholder="Ej: 8 horas continuas"
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Laboratorio</Text>
                      <View style={styles.inlineSelectOptions}>
                        {opcionesLaboratorios.map((opcion) => (
                          <TouchableOpacity
                            key={opcion.value}
                            style={[
                              styles.selectOption,
                              editForm.id_laboratorio === opcion.value &&
                                styles.selectOptionActive,
                            ]}
                            onPress={() => {
                              setEditForm({
                                ...editForm,
                                id_laboratorio: opcion.value,
                              });
                            }}
                          >
                            <Text
                              style={[
                                styles.selectOptionText,
                                editForm.id_laboratorio === opcion.value &&
                                  styles.selectOptionTextActive,
                              ]}
                            >
                              {opcion.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton]}
                    onPress={handleSaveEdit}
                  >
                    <Ionicons name="save" size={20} color="black" />
                    <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Reporte de Salida */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent={true}
      >
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
              <LinearGradient
                colors={["#87bcf8ff", "#539DF3"]}
                style={styles.modalHeader}
              >
                <Text style={styles.modalTitle}>Reporta tu movimiento</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setReportModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </LinearGradient>

              <ScrollView
                style={styles.modalScroll}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* === INICIO DE LA SECCIÓN CORREGIDA === */}
                <View style={styles.formSection}>
                  {/* Campo: Cantidad - OCULTAR para Baja */}
                  {reportForm.id_motivo_baja !== "4" && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Cantidad a reportar</Text>
                      <TextInput
                        style={styles.input}
                        value={reportForm.cantidad}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 0;
                          const max = producto.existencia_actual;
                          setReportForm({
                            ...reportForm,
                            cantidad: num > max ? max.toString() : text,
                          });
                        }}
                        placeholder="1"
                        keyboardType="numeric"
                      />
                      <Text style={styles.hintText}>
                        Stock disponible: {producto.existencia_actual} unidades
                      </Text>
                    </View>
                  )}

                  {/* Mostrar mensaje especial para Baja */}
                  {reportForm.id_motivo_baja === "4" && (
                    <View style={styles.infoBox}>
                      <Ionicons
                        name="information-circle"
                        size={20}
                        color="#539DF3"
                      />
                      <Text style={styles.infoText}>
                        Se dará de baja TODO el stock disponible (
                        {producto.existencia_actual} unidades)
                      </Text>
                    </View>
                  )}

                  {/* Campo: Motivo del reporte - VERSIÓN FILTRADA */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Motivo del reporte</Text>
                    {loadingMovimientos ? (
                      <ActivityIndicator size="small" color="#539DF3" />
                    ) : (
                      (() => {
                        const ordenDeseado = [1, 5, 2, 4, 3];

                        return motivosBaja
                          .filter((motivo) => {
                            // ✅ PARA EQUIPOS (2) Y MATERIALES (3): Solo Baja (4) e Incidencia (2)
                            if (
                              producto.id_tipo_producto === 2 ||
                              producto.id_tipo_producto === 3
                            ) {
                              return (
                                motivo.id_motivo_baja === 4 ||
                                motivo.id_motivo_baja === 2
                              ); // Baja e Incidencia
                            }
                            // PARA REACTIVOS (1): mostrar todos
                            return true;
                          })
                          .sort((a, b) => {
                            // 🔥 NUEVO: 2. Agrega .sort() aquí
                            const posA = ordenDeseado.indexOf(a.id_motivo_baja);
                            const posB = ordenDeseado.indexOf(b.id_motivo_baja);

                            // Si no se encuentra en la lista, se va al final
                            const orderA = posA === -1 ? 99 : posA;
                            const orderB = posB === -1 ? 99 : posB;

                            return orderA - orderB;
                          })
                          .map((motivo) => (
                            <TouchableOpacity
                              key={motivo.id_motivo_baja}
                              style={[
                                styles.radioOption,
                                reportForm.id_motivo_baja ===
                                  motivo.id_motivo_baja.toString() &&
                                  styles.radioOptionSelected,
                              ]}
                              onPress={() => {
                                console.log(
                                  `✅ Motivo seleccionado: ${motivo.nombre_motivo}`
                                );
                                setReportForm({
                                  ...reportForm,
                                  id_motivo_baja:
                                    motivo.id_motivo_baja.toString(),
                                });
                              }}
                            >
                              <View style={styles.radioCircle}>
                                {reportForm.id_motivo_baja ===
                                  motivo.id_motivo_baja.toString() && (
                                  <View style={styles.radioInnerCircle} />
                                )}
                              </View>
                              <Text style={styles.radioText}>
                                {motivo.nombre_motivo}
                              </Text>
                            </TouchableOpacity>
                          ));
                      })() // <-- Los paréntesis finales () ejecutan la función
                    )}
                  </View>
                  {/* Campo: Descripción adicional */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Descripción adicional (opcional)
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={reportForm.descripcion_adicional}
                      onChangeText={(text) =>
                        setReportForm({
                          ...reportForm,
                          descripcion_adicional: text,
                        })
                      }
                      placeholder="Ej: Caducó, se prestó, se consumió, etc."
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
                {/* === FIN DE LA SECCIÓN CORREGIDA === */}

                {/* Botón para confirmar la acción */}
                <TouchableOpacity
                  style={[styles.modalButton, styles.reportSubmitButton]}
                  onPress={handleReportBaja}
                >
                  <Ionicons name="checkmark-circle" size={20} color="black" />
                  <Text style={styles.reportButtonText}>Realizar reporte</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // === ESTILOS GENERALES Y DE CONTENEDOR ===
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // Un fondo ligeramente gris claro
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40, // Espacio al final
  },

  // === NUEVOS ESTILOS DE HEADER ===
  header: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    paddingTop: 50, // Espacio para la barra de estado
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: "center",
  },
  productImage: {
    width: screenWidth * 0.5,
    height: screenWidth * 0.5,
    borderRadius: 16,
    backgroundColor: "#E2E8F0",
  },
  editImageButton: {
    position: "absolute",
    bottom: 24,
    right: screenWidth * 0.25 - 20,
    backgroundColor: "#4d4d4dff",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
    elevation: 5,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: "#334155",
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },

  // === NUEVOS BOTONES DE ACCIÓN PRINCIPALES ===
  mainActionsContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  mainButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#539DF3",
  },
  secondaryButton: {
    backgroundColor: "#ffffffff",
    borderWidth: 1,
    borderColor: "#539DF3",
  },
  mainButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
  },
  secondaryButtonText: {
    color: "#000000ff",
  },

  // === ESTILOS DE TARJETAS (CARDS) REFINADOS ===
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "#1E293B",
    marginLeft: 8,
  },

  // === NUEVA SECCIÓN DE DOCUMENTOS ===
  documentLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  documentLinkText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#334155",
    fontWeight: "500",
  },

  // === ESTILOS DE INFORMACIÓN Y DETALLES REFINADOS ===
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#1E293B",
    fontWeight: "600",
  },
  stockValue: {
    color: "#539DF3",
    fontSize: 16,
    fontFamily: "Poppins_700Bold",
  },
  detailsGrid: {
    gap: 0,
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#64748B",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#1E293B",
    fontWeight: "500",
  },
  laboratorioValue: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#1E293B",
    fontWeight: "500",
    flex: 1,
    flexWrap: "wrap",
    textAlign: "right",
    marginLeft: 8,
  },

  // === TARJETA DE ADVERTENCIA ===
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    marginBottom: 2,
  },
  warningMessage: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },

  // === SECCIÓN DE HISTORIAL REFINADA ===
  historialScrollContainer: {
    maxHeight: 300,
  },
  historialItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    alignItems: "center",
  },
  historialIcon: {
    marginRight: 15,
  },
  historialContent: {
    flex: 1,
  },
  historialTitle: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    fontWeight: "bold",
    color: "#333",
  },
  historialSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#777",
    marginTop: 2,
  },
  historialDescription: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#555",
    fontStyle: "italic",
    marginTop: 8,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 6,
    overflow: "hidden",
  },
  noHistorialText: {
    textAlign: "center",
    color: "#94A3B8",
    marginVertical: 20,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
  },

  // === ESTILOS DE MODALES (GENERAL) ===
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    minHeight: "50%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    fontWeight: "bold",
    color: "white",
  },
  closeButton: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalActions: {
    marginTop: 24,
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },

  // === ESTILOS PARA MODAL DE DOCUMENTOS ===
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 16,
    color: "#64748B",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },
  emptyStateSubtext: {
    marginTop: 8,
    color: "#94A3B8",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
  },
  docIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontFamily: "Poppins_700Bold",
    fontWeight: "600",
    color: "#1E293B",
  },
  docMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  docMetaText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
  },
  docDate: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#94A3B8",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffffff",
    borderColor: "#539DF3",
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  uploadButtonText: {
    color: "#000000ff",
    fontWeight: "bold",
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
  },
  formatInfo: {
    marginTop: 16,
    padding: 12,
  },
  formatInfoText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    textAlign: "center",
  },

  // === NUEVOS ESTILOS PARA FORMULARIOS (MODALES) ===
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    backgroundColor: "white",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 16,
  },
  inlineSelectOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "white",
  },
  selectOptionActive: {
    backgroundColor: "#539DF3",
    borderColor: "#539DF3",
  },
  selectOptionText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#374151",
  },
  selectOptionTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    marginBottom: 8,
  },
  radioOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#539DF3",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#539DF3",
  },
  radioText: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#000000ff",
    flex: 1,
  },
  stockCount: {
    fontWeight: "bold",
    color: "#539DF3",
  },
  saveButton: {
    backgroundColor: "#ffffffff",
    borderColor: "#539DF3",
    borderWidth: 1,
  },
  saveButtonText: {
    color: "#000000ff",
    fontWeight: "bold",
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
  },
  reportSubmitButton: {
    backgroundColor: "#ffffffff",
    borderColor: "#539DF3",
    borderWidth: 1,
  },
  reportButtonText: {
    color: "black",
    fontWeight: "bold",
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#64748B",
    marginTop: 4,
    fontStyle: "italic",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#539DF3",
  },
  infoText: {
    marginLeft: 8,
    color: "#374151",
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    flex: 1,
  },
});
