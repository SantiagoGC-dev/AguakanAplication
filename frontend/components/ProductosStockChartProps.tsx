import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import {
  VictoryLine,
  VictoryChart,
  VictoryTheme,
  VictoryAxis,
  VictoryScatter,
  VictoryVoronoiContainer,
  VictoryTooltip,
} from "victory-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface PuntoGrafica {
  x: string | Date;
  y: number;
  tipo?: string;
  cantidad?: number;
  motivo?: string;
  label?: string;
  fechaOriginal?: Date;
}

interface TendenciaStockChartProps {
  datos: PuntoGrafica[];
  titulo?: string;
  mostrarPuntos?: boolean;
  isDark?: boolean;
}

const TendenciaStockChart: React.FC<TendenciaStockChartProps> = ({
  datos,
  titulo = "Historial de Movimientos",
  mostrarPuntos = true,
  isDark: isDarkProp,
}) => {
  const colorScheme = useColorScheme();
  const isDark = isDarkProp ?? colorScheme === "dark";
  const { width: screenWidth } = useWindowDimensions();
  const [activePoint, setActivePoint] = useState<PuntoGrafica | null>(null);
  
  // Ajuste de ancho
  const chartWidth = Math.max(screenWidth - 48, 340);

  // --- PROCESAMIENTO DE DATOS ---
  const datosProcesados = useMemo(() => {
    if (!datos || datos.length === 0) return [];
    return datos.map((p) => ({
      x: typeof p.x === "string" ? new Date(p.x) : p.x,
      y: typeof p.y === "number" ? Math.max(0, p.y) : 0,
      tipo: p.tipo || 'default',
      cantidad: p.cantidad || 0,
      motivo: p.motivo || '',
      label: p.label || '',
      fechaOriginal: typeof p.x === "string" ? new Date(p.x) : p.x,
    }));
  }, [datos]);

  const datosOrdenados = useMemo(() => {
    return [...datosProcesados].sort((a, b) => {
      const dateA = a.x instanceof Date ? a.x.getTime() : 0;
      const dateB = b.x instanceof Date ? b.x.getTime() : 0;
      return dateA - dateB;
    });
  }, [datosProcesados]);

  // DATOS PARA VICTORY (solo x e y)
  const datosVictory = useMemo(() => {
    return datosOrdenados.map((d) => ({
      x: d.x,
      y: d.y,
      // Victory necesita un identificador único
      id: `${d.x.getTime()}-${d.y}`,
    }));
  }, [datosOrdenados]);

  // Mapa para buscar datos completos por fecha
  const datosMap = useMemo(() => {
    const map = new Map<string, PuntoGrafica>();
    datosOrdenados.forEach(d => {
      const key = `${d.x.getTime()}-${d.y}`;
      map.set(key, d);
    });
    return map;
  }, [datosOrdenados]);

  // Contar movimientos REALES (excluyendo el punto 'inicio')
  const movimientosReales = useMemo(() => {
    return datosProcesados.filter(p => p.tipo !== 'inicio').length;
  }, [datosProcesados]);

  // Formatear fecha para el panel
  const formatFechaTooltip = (fecha: Date | undefined) => {
    if (!fecha || !(fecha instanceof Date) || isNaN(fecha.getTime())) return "";
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(fecha);
  };

  // Determinar color del punto según tipo
  const getPointColor = (tipo: string = '', isActive: boolean = false) => {
    if (isActive) return "#3B82F6";
    
    switch(tipo) {
      case 'entrada':
        return "#10B981"; // Verde
      case 'salida':
        return "#EF4444"; // Rojo
      case 'iniciar_uso':
        return "#3B82F6"; // Azul
      case 'inicio':
        return "#94A3B8"; // Gris
      default:
        return "#fff"; // Blanco
    }
  };

  // Determinar color de borde según tipo
  const getStrokeColor = (tipo: string = '') => {
    switch(tipo) {
      case 'entrada':
        return "#10B981";
      case 'salida':
        return "#EF4444";
      case 'iniciar_uso':
        return "#3B82F6";
      case 'inicio':
        return "#94A3B8";
      default:
        return "#3B82F6";
    }
  };

  // Formatear información para el panel según tipo de movimiento
  const formatInfoValue = (point: PuntoGrafica) => {
    if (!point) return "";
    
    if (point.cantidad !== undefined && point.cantidad > 0) {
      return `+${point.cantidad}`;
    } else if (point.cantidad !== undefined && point.cantidad < 0) {
      return `${point.cantidad}`;
    } else {
      return `${point.y}`;
    }
  };

  const handlePointPress = (event: any, props: any) => {
    if (props.datum && props.datum.id) {
      const puntoCompleto = datosMap.get(props.datum.id);
      if (puntoCompleto) {
        setActivePoint(puntoCompleto);
      }
    }
  };

  // Función para manejar selección desde VictoryVoronoiContainer
  const handlePointsActivated = (points: any[]) => {
    if (points.length > 0 && points[0] && points[0].id) {
      const puntoCompleto = datosMap.get(points[0].id);
      if (puntoCompleto) {
        setActivePoint(puntoCompleto);
      }
    }
  };

  // --- RENDERIZADO CONDICIONAL VACÍO ---
  if (datosOrdenados.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDark && styles.textDark]}>
          Sin movimientos registrados
        </Text>
      </View>
    );
  }

  // --- FORMATOS ---
  const formatFechaEjeX = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
    }).format(date);
  };

  // --- ESTILOS DE GRÁFICA ---
  const axisStyle = {
    axis: { stroke: isDark ? "#444" : "#CBD5E1", strokeWidth: 1 },
    ticks: { stroke: isDark ? "#444" : "#CBD5E1", size: 4 },
    tickLabels: {
      fontSize: 10,
      fill: isDark ? "#94A3B8" : "#64748B",
      padding: 4,
      fontFamily: "System",
    },
    grid: {
      stroke: isDark ? "#333" : "#F1F5F9",
      strokeDasharray: "4,4",
      strokeWidth: 1,
    },
  };

  const hiddenYAxisStyle = {
    ...axisStyle,
    axis: { stroke: "transparent" },
    ticks: { stroke: "transparent" },
    tickLabels: { fill: "transparent" },
  };

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        
        {/* Header */}
        <View style={styles.headerSection}>
          <View>
             <Text style={[styles.titulo, isDark && styles.textDark]}>{titulo}</Text>
             <Text style={[styles.subtitulo, isDark && styles.subtituloDark]}>
                Movimientos: {movimientosReales}
             </Text>
          </View>
        </View>

        {/* --- PANEL DE INFORMACIÓN FIJO --- */}
        <View style={[styles.infoPanel, isDark && styles.infoPanelDark]}>
          {activePoint ? (
            <View style={styles.infoContent}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>Fecha</Text>
                <Text style={[styles.infoValue, isDark && styles.infoValueDark]}>
                  {formatFechaTooltip(activePoint.fechaOriginal)}
                </Text>
                {activePoint.motivo && (
                  <Text style={[styles.infoMotivo, isDark && styles.infoMotivoDark]}>
                    {activePoint.motivo}
                  </Text>
                )}
              </View>
              <View style={styles.divider} />
              <View style={styles.infoCol}>
                <Text style={[styles.infoLabel, isDark && styles.infoLabelDark]}>
                  {activePoint.tipo === 'inicio' ? 'Stock inicial' : 
                   activePoint.cantidad ? 'Cantidad' : 'Stock'}
                </Text>
                <Text style={[
                  styles.infoValueHighlight, 
                  isDark && styles.infoValueHighlightDark,
                  activePoint.tipo === 'entrada' && styles.infoEntrada,
                  activePoint.tipo === 'salida' && styles.infoSalida,
                  activePoint.tipo === 'iniciar_uso' && styles.infoIniciarUso
                ]}>
                  {formatInfoValue(activePoint)}
                </Text>
                {activePoint.tipo !== 'inicio' && activePoint.cantidad !== undefined && (
                  <Text style={[styles.infoStock, isDark && styles.infoStockDark]}>
                    Stock: {activePoint.y}
                  </Text>
                )}
              </View>
            </View>
          ) : (
             <View style={styles.placeholderContainer}>
                <Text style={[styles.placeholderText, isDark && styles.placeholderTextDark]}>
                   Selecciona un punto en la gráfica para ver detalles
                </Text>
             </View>
          )}
        </View>

        {/* Gráfica */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ width: chartWidth, paddingVertical: 10 }}>
            <VictoryChart
              theme={VictoryTheme.material}
              scale={{ x: "time" }}
              minDomain={{ y: 0 }}
              width={chartWidth}
              height={260}
              padding={{ top: 20, bottom: 40, left: 20, right: 30 }}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={() => " "}
                  labelComponent={
                    <VictoryTooltip 
                      renderInPortal={false}
                      flyoutStyle={{ fill: "transparent", stroke: "transparent" }} 
                    />
                  }
                  voronoiPadding={10}
                  onActivated={(points) => handlePointsActivated(points)}
                />
              }
            >
              <VictoryAxis
                scale="time"
                tickFormat={formatFechaEjeX}
                style={axisStyle}
                tickCount={datosOrdenados.length > 5 ? 5 : datosOrdenados.length}
              />
              <VictoryAxis dependentAxis style={hiddenYAxisStyle} />

              <VictoryLine
                data={datosVictory}
                interpolation="monotoneX"
                style={{
                  data: {
                    stroke: "#3B82F6",
                    strokeWidth: 3,
                    strokeLinecap: "round",
                  },
                }}
                animate={{
                  duration: 1500,
                  onLoad: { duration: 1000 },
                }}
              />

              {mostrarPuntos && (
                <VictoryScatter
                  data={datosVictory}
                  size={({ datum }) => {
                    if (!activePoint) return 6;
                    const puntoCompleto = datosMap.get(datum.id);
                    return (puntoCompleto && activePoint.x === puntoCompleto.x) ? 8 : 6;
                  }}
                  style={{
                    data: {
                      fill: ({ datum }) => {
                        const puntoCompleto = datosMap.get(datum.id);
                        if (!puntoCompleto) return "#fff";
                        
                        const isActive = activePoint && activePoint.x === puntoCompleto.x;
                        return getPointColor(puntoCompleto.tipo, !!isActive);
                      },
                      stroke: ({ datum }) => {
                        const puntoCompleto = datosMap.get(datum.id);
                        return puntoCompleto ? getStrokeColor(puntoCompleto.tipo) : "#3B82F6";
                      },
                      strokeWidth: 2,
                    },
                  }}
                  events={[{
                    target: "data",
                    eventHandlers: {
                      onPressIn: handlePointPress,
                    },
                  }]}
                />
              )}
            </VictoryChart>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    margin: 2,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  containerDark: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    shadowOpacity: 0,
  },
  headerSection: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titulo: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitulo: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2
  },
  subtituloDark: {
    color: "#A1A1AA"
  },
  infoPanel: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 70,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  infoPanelDark: {
    backgroundColor: "#27272a",
    borderColor: "#3F3F46"
  },
  infoContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoCol: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#CBD5E1'
  },
  infoLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.5
  },
  infoLabelDark: {
    color: "#94A3B8"
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    textAlign: 'center',
    marginBottom: 2,
  },
  infoValueDark: {
    color: "#E2E8F0"
  },
  infoMotivo: {
    fontSize: 10,
    color: "#64748B",
    fontStyle: 'italic',
    marginTop: 2,
  },
  infoMotivoDark: {
    color: "#94A3B8"
  },
  infoValueHighlight: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3B82F6"
  },
  infoValueHighlightDark: {
    color: "#60A5FA"
  },
  infoEntrada: {
    color: "#10B981",
  },
  infoSalida: {
    color: "#EF4444",
  },
  infoIniciarUso: {
    color: "#3B82F6",
  },
  infoStock: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  infoStockDark: {
    color: "#94A3B8"
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
    textAlign: 'center',
  },
  placeholderTextDark: {
    color: "#71717A"
  },
  emptyContainer: {
    padding: 30,
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  emptyContainerDark: {
    backgroundColor: "#18181b",
    borderColor: "#27272a",
    borderWidth: 1,
  },
  emptyText: {
    color: "#64748B",
    fontWeight: "500",
    fontSize: 16,
  },
  textDark: { color: "#fff" },
  leyendaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 12,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leyendaColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  leyendaText: {
    fontSize: 12,
    color: "#64748B",
  },
  leyendaTextDark: {
    color: "#A1A1AA"
  },
});

export default TendenciaStockChart;