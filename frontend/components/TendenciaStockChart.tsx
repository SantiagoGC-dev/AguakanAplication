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
  x: string;
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

  const datosProcesados = useMemo(
    () =>
      datos?.map((p) => ({
        x: p.x,
        y: typeof p.y === "number" ? p.y : 0,
      })) ?? [],
    [datos]
  );

  const estadisticas = useMemo(() => {
    const valores = datosProcesados.map((d) => d.y);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const promedio = Math.round(
      valores.reduce((a, b) => a + b, 0) / valores.length
    );
    return { min, max, promedio };
  }, [datosProcesados]);

  if (datosProcesados.length === 0) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.emptyContainerDark]}>
        <Text style={[styles.emptyText, isDark && styles.textDark]}>📊 No hay datos históricos</Text>
        <Text style={[styles.emptySubtext, isDark && styles.textMutedDark]}>Agrega datos para ver la tendencia</Text>
      </View>
    );
  }

  const formatFecha = (valor: string) => {
    const d = new Date(valor);
    if (isNaN(d.getTime())) return valor;
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  // Estilos dinámicos para el chart basados en el tema
  const axisStyle = {
    axis: { 
      stroke: isDark ? "#444" : "#CBD5E1", 
      strokeWidth: 1 
    },
    ticks: { 
      stroke: isDark ? "#444" : "#CBD5E1", 
      size: 5 
    },
    tickLabels: {
      fontSize: 11,
      fill: isDark ? "#888" : "#475569",
      padding: 6,
      fontWeight: "500",
    },
    grid: { 
      stroke: isDark ? "#333" : "#E2E8F0", 
      strokeDasharray: "4,4" 
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
    fontWeight: "500"
  };

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.titulo, isDark && styles.textDark]}>{titulo}</Text>
          <View style={[styles.badgeContainer, isDark && styles.badgeContainerDark]}>
            <Text style={[styles.badgeText, isDark && styles.badgeTextDark]}>{datosProcesados.length} registros</Text>
          </View>
        </View>

        {/* Chart */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.chartWrapper, isDark && styles.chartWrapperDark, { width: chartWidth }]}>
            <VictoryChart
              theme={VictoryTheme.material}
              containerComponent={
                <VictoryVoronoiContainer
                  labels={({ datum }) =>
                    `${formatFecha(datum.x)}\n${datum.y} unidades`
                  }
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
                tickFormat={formatFecha}
                tickCount={Math.min(6, datosProcesados.length)}
                style={axisStyle}
              />
              <VictoryAxis dependentAxis tickCount={6} style={axisStyle} />

              <VictoryLine
                data={datosProcesados}
                interpolation="monotoneX"
                style={{
                  data: {
                    stroke: "#3B82F6",
                    strokeWidth: 3,
                    strokeLinecap: "round",
                  },
                }}
                animate={{ duration: 1200, onLoad: { duration: 800 } }}
              />

              {mostrarPuntos && (
                <VictoryScatter
                  data={datosProcesados}
                  size={5}
                  style={{
                    data: {
                      fill: "#3B82F6",
                      stroke: isDark ? "#1c1c1e" : "#fff",
                      strokeWidth: 2,
                    },
                  }}
                />
              )}
            </VictoryChart>
          </View>
        </ScrollView>

        {/* Stats */}
        <View style={[styles.statsContainer, isDark && styles.statsContainerDark]}>
          {[
            { label: "Máximo", value: estadisticas.max },
            { label: "Promedio", value: estadisticas.promedio },
            { label: "Mínimo", value: estadisticas.min },
          ].map((item) => (
            <View key={item.label} style={styles.statBox}>
              <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>{item.label}</Text>
              <Text style={[styles.statValue, isDark && styles.textDark]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={[styles.legend, isDark && styles.legendDark]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#3B82F6" }]} />
            <Text style={[styles.legendText, isDark && styles.textDark]}>Stock histórico</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    margin: 14,
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
    color: "#0369A1" 
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
    flex: 1 
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
    alignItems: "center" 
  },
  legendColor: { 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    marginRight: 8 
  },
  legendText: { 
    fontSize: 13, 
    color: "#475569", 
    fontWeight: "500" 
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
    textAlign: "center" 
  },

  // Text Colors
  textDark: {
    color: "#fff",
  },
  textMutedDark: {
    color: "#888",
  },
});

export default TendenciaStockChart;