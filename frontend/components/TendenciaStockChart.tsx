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

interface PuntoGrafica {
  x: string;
  y: number;
}

interface TendenciaStockChartProps {
  datos: PuntoGrafica[];
  titulo?: string;
  mostrarPuntos?: boolean;
}

const TendenciaStockChart: React.FC<TendenciaStockChartProps> = ({
  datos,
  titulo = "Tendencia de Stock Histórico",
  mostrarPuntos = true,
}) => {
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
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📊 No hay datos históricos</Text>
        <Text style={styles.emptySubtext}>Agrega datos para ver la tendencia</Text>
      </View>
    );
  }

  const formatFecha = (valor: string) => {
    const d = new Date(valor);
    if (isNaN(d.getTime())) return valor;
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titulo}>{titulo}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{datosProcesados.length} registros</Text>
          </View>
        </View>

        {/* Chart */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.chartWrapper, { width: chartWidth }]}>
            <VictoryChart
              theme={VictoryTheme.material}
              containerComponent={
                <VictoryVoronoiContainer
                  labels={({ datum }) =>
                    `${formatFecha(datum.x)}\n${datum.y} unidades`
                  }
                  labelComponent={
                    <VictoryTooltip
                      flyoutStyle={{
                        fill: "#1E293B",
                        stroke: "#3B82F6",
                        strokeWidth: 1,
                      }}
                      style={{ fill: "#F8FAFC", fontSize: 11, fontWeight: "500" }}
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
                      stroke: "#fff",
                      strokeWidth: 2,
                    },
                  }}
                />
              )}
            </VictoryChart>
          </View>
        </ScrollView>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {[
            { label: "Máximo", value: estadisticas.max },
            { label: "Promedio", value: estadisticas.promedio },
            { label: "Mínimo", value: estadisticas.min },
          ].map((item) => (
            <View key={item.label} style={styles.statBox}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: "#3B82F6" }]} />
            <Text style={styles.legendText}>Stock histórico</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const axisStyle = {
  axis: { stroke: "#CBD5E1", strokeWidth: 1 },
  ticks: { stroke: "#CBD5E1", size: 5 },
  tickLabels: {
    fontSize: 11,
    fill: "#475569",
    padding: 6,
    fontWeight: "500",
  },
  grid: { stroke: "#E2E8F0", strokeDasharray: "4,4" },
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
  badgeText: { fontSize: 12, fontWeight: "600", color: "#0369A1" },
  chartWrapper: {
    minWidth: 320,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  statBox: { alignItems: "center", flex: 1 },
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
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendColor: { width: 14, height: 14, borderRadius: 7, marginRight: 8 },
  legendText: { fontSize: 13, color: "#475569", fontWeight: "500" },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    margin: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: { fontSize: 13, color: "#94A3B8", textAlign: "center" },
});

export default TendenciaStockChart;
