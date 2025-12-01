import React, { useMemo } from "react";
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
  VictoryTooltip,
  VictoryVoronoiContainer,
} from "victory-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface PuntoGrafica {
  x: string | Date;
  y: number;
}

interface TendenciaStockChartProps {
  datos: PuntoGrafica[];
  titulo?: string;
  mostrarPuntos?: boolean;
  isDark?: boolean;
}

const TendenciaStockChart: React.FC<TendenciaStockChartProps> = ({
  datos,
  titulo = "Tendencia de Stock Histórico",
  mostrarPuntos = true,
  isDark: isDarkProp,
}) => {
  const colorScheme = useColorScheme();
  const isDark = isDarkProp ?? colorScheme === "dark";
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(screenWidth - 32, 340);

  // Procesar datos para convertir strings de fecha a objetos Date
  const datosProcesados = useMemo(() => {
    if (!datos || datos.length === 0) return [];

    return datos.map((p) => ({
      x: typeof p.x === "string" ? new Date(p.x) : p.x,
      y: typeof p.y === "number" ? p.y : 0,
    }));
  }, [datos]);

  // Ordenar datos por fecha para asegurar que se muestren en orden cronológico
  const datosOrdenados = useMemo(() => {
    return [...datosProcesados].sort((a, b) => {
      const dateA = a.x instanceof Date ? a.x.getTime() : 0;
      const dateB = b.x instanceof Date ? b.x.getTime() : 0;
      return dateA - dateB;
    });
  }, [datosProcesados]);

  const estadisticas = useMemo(() => {
    const valores = datosOrdenados.map((d) => d.y);
    if (valores.length === 0) return { min: 0, max: 0, promedio: 0 };

    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const promedio = Math.round(
      valores.reduce((a, b) => a + b, 0) / valores.length
    );
    return { min, max, promedio };
  }, [datosOrdenados]);

  // Prevenir múltiples tooltips - datos con IDs únicos
  const datosConId = useMemo(() => {
    return datosOrdenados.map((d, index) => ({
      ...d,
      id: `punto-${index}`, // ID único para cada punto
    }));
  }, [datosOrdenados]);

  if (datosOrdenados.length === 0) {
    return (
      <View
        style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}
      >
        <Text style={[styles.emptyText, isDark && styles.textDark]}>
          📊 No hay datos históricos
        </Text>
        <Text style={[styles.emptySubtext, isDark && styles.textMutedDark]}>
          Agrega datos para ver la tendencia
        </Text>
      </View>
    );
  }

  // Formato de fecha para las etiquetas del eje X
  const formatFechaEjeX = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "";
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);

    return datosOrdenados.length <= 10 ? `${day}/${month}` : `${month}/${year}`;
  };

  // Formato de fecha para el tooltip
  const formatFechaTooltip = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "Fecha inválida";
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    };

    return new Intl.DateTimeFormat("es-ES", options).format(date);
  };

  // Calcular ticks apropiados para el eje X
  const getXTicks = useMemo(() => {
    if (datosOrdenados.length <= 5) {
      return datosOrdenados.map((d) => d.x as Date);
    }

    const ticks = [];
    const step = Math.max(1, Math.floor(datosOrdenados.length / 5));

    for (let i = 0; i < datosOrdenados.length; i += step) {
      ticks.push(datosOrdenados[i].x as Date);
    }

    if (
      ticks[ticks.length - 1] !== datosOrdenados[datosOrdenados.length - 1].x
    ) {
      ticks.push(datosOrdenados[datosOrdenados.length - 1].x as Date);
    }

    return ticks;
  }, [datosOrdenados]);

  // Estilos dinámicos para el chart basados en el tema
  const axisStyle = {
    axis: {
      stroke: isDark ? "#444" : "#CBD5E1",
      strokeWidth: 1,
    },
    ticks: {
      stroke: isDark ? "#444" : "#CBD5E1",
      size: 5,
    },
    tickLabels: {
      fontSize: 11,
      fill: isDark ? "#888" : "#475569",
      padding: 6,
      fontWeight: "500",
    },
    grid: {
      stroke: isDark ? "#333" : "#E2E8F0",
      strokeDasharray: "4,4",
    },
  };

  const tooltipStyle = {
    fill: isDark ? "#1c1c1e" : "#1E293B",
    stroke: "#3B82F6",
    strokeWidth: 1,
  };

  const tooltipTextStyle = {
    fill: isDark ? "#fff" : "#F8FAFC",
    fontSize: 11,
    fontWeight: "500",
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.titulo, isDark && styles.textDark]}>
            {titulo}
          </Text>
          <View
            style={[styles.badgeContainer, isDark && styles.badgeContainerDark]}
          >
            <Text style={[styles.badgeText, isDark && styles.badgeTextDark]}>
              {datosOrdenados.length} registros
            </Text>
          </View>
        </View>

        {/* Chart */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View
            style={[
              styles.chartWrapper,
              isDark && styles.chartWrapperDark,
              { width: chartWidth },
            ]}
          >
            <VictoryChart
              theme={VictoryTheme.material}
              scale={{ x: "time" }}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => {
                    // Verificar y evitar duplicados
                    if (datum._id) return "";
                    return `${formatFechaTooltip(datum.x)}\n${
                      datum.y
                    } unidades`;
                  }}
                  labelComponent={
                    <VictoryTooltip
                      flyoutStyle={tooltipStyle}
                      style={tooltipTextStyle}
                      cornerRadius={6}
                      pointerLength={8}
                    />
                  }
                />
              }
              width={chartWidth}
              height={280}
              padding={{ top: 30, bottom: 50, left: 60, right: 30 }}
            >
              <VictoryAxis
                scale="time"
                tickFormat={formatFechaEjeX}
                tickValues={getXTicks}
                style={axisStyle}
              />
              <VictoryAxis dependentAxis tickCount={6} style={axisStyle} />

              <VictoryLine
                data={datosConId}
                interpolation="monotoneX"
                style={{
                  data: {
                    stroke: "#3B82F6",
                    strokeWidth: 3,
                    strokeLinecap: "round",
                  },
                }}
                animate={{ duration: 1200, onLoad: { duration: 800 } }}
                events={[]} // Sin eventos propios para evitar conflictos
              />

              {mostrarPuntos && (
                <VictoryScatter
                  data={datosConId}
                  size={5}
                  style={{
                    data: {
                      fill: "#3B82F6",
                      stroke: isDark ? "#1c1c1e" : "#fff",
                      strokeWidth: 2,
                    },
                  }}
                  events={[]} // Sin eventos propios, usar solo el del contenedor
                />
              )}
            </VictoryChart>
          </View>
        </ScrollView>

        {/* Stats */}
        <View
          style={[styles.statsContainer, isDark && styles.statsContainerDark]}
        >
          {[
            { label: "Máximo", value: estadisticas.max },
            { label: "Promedio", value: estadisticas.promedio },
            { label: "Mínimo", value: estadisticas.min },
          ].map((item) => (
            <View key={item.label} style={styles.statBox}>
              <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>
                {item.label}
              </Text>
              <Text style={[styles.statValue, isDark && styles.textDark]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={[styles.legend, isDark && styles.legendDark]}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#3B82F6" }]}
            />
            <Text style={[styles.legendText, isDark && styles.textDark]}>
              Stock histórico
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

// Los estilos permanecen igual...
const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  container: {
    backgroundColor: "#ffffffff",
    borderRadius: 20,
    padding: 16,
    margin: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  containerDark: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerDark: {
    borderBottomColor: "#333",
  },
  titulo: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  badgeContainer: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeContainerDark: {
    backgroundColor: "#2c2c2e",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0369A1",
  },
  badgeTextDark: {
    color: "#60A5FA",
  },
  chartWrapper: {
    minWidth: 320,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  chartWrapperDark: {
    backgroundColor: "#2c2c2e",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  statsContainerDark: {
    backgroundColor: "#2c2c2e",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  legendDark: {
    borderTopColor: "#333",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    margin: 12,
  },
  emptyContainerDark: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#333",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
  },
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});

export default TendenciaStockChart;
