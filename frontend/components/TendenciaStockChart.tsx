import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import {
  VictoryLine,
  VictoryChart,
  VictoryTheme,
  VictoryAxis,
  VictoryScatter,
  VictoryVoronoiContainer
} from 'victory-native';

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
  titulo = 'Tendencia de Stock Histórico',
  mostrarPuntos = true
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(screenWidth - 32, 320); // mínimo para evitar compresión

  const datosProcesados = useMemo(() => {
    return datos?.map(p => ({
      x: p.x,
      y: typeof p.y === 'number' ? p.y : 0
    })) ?? [];
  }, [datos]);

  const estadisticas = useMemo(() => {
    const valores = datosProcesados.map(d => d.y);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const promedio = Math.round(valores.reduce((a, b) => a + b, 0) / valores.length);
    return { min, max, promedio };
  }, [datosProcesados]);

  if (datosProcesados.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>📊 No hay datos históricos disponibles</Text>
        <Text style={styles.emptySubtext}>Agrega datos para ver la tendencia</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.container}>
        {/* Encabezado */}
        <View style={styles.header}>
          <Text style={styles.titulo}>{titulo}</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{datosProcesados.length} registros</Text>
          </View>
        </View>

        {/* Gráfico con scroll horizontal si es necesario */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[styles.chartWrapper, { width: chartWidth }]}>
            <VictoryChart
              theme={VictoryTheme.material}
              containerComponent={
                <VictoryVoronoiContainer
                  labels={({ datum }) => `${datum.x}\n${datum.y} unidades`}
                />
              }
              width={chartWidth}
              height={280}
              padding={{ top: 30, bottom: 50, left: 60, right: 20 }}
            >
              <VictoryAxis
                tickFormat={(tick) => {
                  const date = new Date(tick);
                  return !isNaN(date.getTime())
                    ? `${date.getDate()}/${date.getMonth() + 1}`
                    : tick;
                }}
                tickCount={Math.min(6, datosProcesados.length)}
                style={axisStyle}
              />
              <VictoryAxis dependentAxis tickCount={6} style={axisStyle} />

              <VictoryLine
                data={datosProcesados}
                interpolation="catmullRom"
                style={{
                  data: {
                    stroke: '#3B82F6',
                    strokeWidth: 3,
                    strokeLinecap: 'round'
                  }
                }}
                animate={{ duration: 1000, onLoad: { duration: 600 } }}
              />

              {mostrarPuntos && (
                <VictoryScatter
                  data={datosProcesados}
                  size={5}
                  style={{
                    data: {
                      fill: '#3B82F6',
                      stroke: '#FFFFFF',
                      strokeWidth: 2
                    }
                  }}
                />
              )}
            </VictoryChart>
          </View>
        </ScrollView>

        {/* Estadísticas */}
        <View style={styles.statsContainer}>
          {['Máximo', 'Promedio', 'Mínimo'].map((label, i) => (
            <View key={label} style={styles.statBox}>
              <Text style={styles.statLabel}>{label}</Text>
              <Text style={styles.statValue}>
                {label === 'Máximo'
                  ? estadisticas.max
                  : label === 'Promedio'
                  ? estadisticas.promedio
                  : estadisticas.min}
              </Text>
            </View>
          ))}
        </View>

        {/* Leyenda */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>Stock histórico</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const axisStyle = {
  axis: { stroke: '#CBD5E1', strokeWidth: 1 },
  ticks: { stroke: '#CBD5E1', size: 5 },
  tickLabels: {
    fontSize: 10,
    fill: '#475569',
    padding: 6,
    fontWeight: '500'
  },
  grid: { stroke: '#F1F5F9', strokeDasharray: '4,4' }
};

const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  badgeContainer: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  chartWrapper: {
    minWidth: 320,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    margin: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default TendenciaStockChart;
