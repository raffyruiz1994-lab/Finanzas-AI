import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

export type InsightType = 'daily_avg' | 'top_cat' | 'top_day' | 'comparison';

interface InsightDetailModalProps {
  visible: boolean;
  type: InsightType | null;
  dailyAverage: number;
  totalExpense: number;
  daysCount: number;
  topCategoryName?: string;
  topCategoryAmount?: number;
  onClose: () => void;
}

const DAYS_OF_WEEK = [
  { day: 'Lun', percentage: 12, amount: 2800 },
  { day: 'Mar', percentage: 8, amount: 1900 },
  { day: 'Mié', percentage: 14, amount: 3300 },
  { day: 'Jue', percentage: 10, amount: 2400 },
  { day: 'Vie', percentage: 18, amount: 4200 },
  { day: 'Sáb', percentage: 26, amount: 6100, isTop: true },
  { day: 'Dom', percentage: 12, amount: 2800 },
];

export const InsightDetailModal: React.FC<InsightDetailModalProps> = ({
  visible,
  type,
  dailyAverage,
  totalExpense,
  daysCount,
  topCategoryName = 'Educación',
  topCategoryAmount = 0,
  onClose,
}) => {
  if (!type) return null;

  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currencyCode = useSettingsStore((state) => state.currency);

  const getTitle = () => {
    switch (type) {
      case 'daily_avg':
        return 'Análisis de Gasto Diario';
      case 'top_cat':
        return 'Categoría con Mayor Impacto';
      case 'top_day':
        return 'Distribución por Día de la Semana';
      case 'comparison':
        return 'Comparativa vs Período Anterior';
      default:
        return 'Detalle de Métrica';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Tocar fuera cierra el modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons
                  name={
                    type === 'daily_avg'
                      ? 'cash-outline'
                      : type === 'top_cat'
                      ? 'trophy-outline'
                      : type === 'top_day'
                      ? 'calendar-outline'
                      : 'trending-down-outline'
                  }
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
            </View>

            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* 1. Daily Average */}
            {type === 'daily_avg' && (
              <View style={styles.contentCol}>
                <Text style={[styles.bigVal, { color: colors.primary }]}>
                  {formatCurrency(dailyAverage, currencyCode)} / día
                </Text>
                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                  Calculado a partir de {formatCurrency(totalExpense, currencyCode)} divididos entre los {daysCount} días del ciclo actual.
                </Text>

                <View style={[styles.dataBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Ritmo de gasto mensual estimado:</Text>
                    <Text style={[styles.dataValue, { color: colors.text }]}>
                      {formatCurrency(dailyAverage * 30, currencyCode)}
                    </Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Día de menor consumo:</Text>
                    <Text style={[styles.dataValue, { color: colors.income }]}>Martes (RD$1,900)</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Día de mayor consumo:</Text>
                    <Text style={[styles.dataValue, { color: colors.expense }]}>Sábado (RD$6,100)</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 2. Top Category */}
            {type === 'top_cat' && (
              <View style={styles.contentCol}>
                <Text style={[styles.bigVal, { color: colors.primary }]}>
                  {topCategoryName}
                </Text>
                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                  Representa el mayor porcentaje de tus salidas este mes con un gasto total de {formatCurrency(topCategoryAmount, currencyCode)}.
                </Text>

                <View style={[styles.dataBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Porcentaje del presupuesto:</Text>
                    <Text style={[styles.dataValue, { color: colors.warning }]}>
                      {totalExpense > 0 ? Math.round((topCategoryAmount / totalExpense) * 100) : 0}%
                    </Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Estado frente al mes pasado:</Text>
                    <Text style={[styles.dataValue, { color: colors.income }]}>+4% controlado</Text>
                  </View>
                </View>
              </View>
            )}

            {/* 3. Top Day of Week Chart */}
            {type === 'top_day' && (
              <View style={styles.contentCol}>
                <Text style={[styles.bigVal, { color: colors.primary }]}>Sábado</Text>
                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                  Tus gastos se concentran los fines de semana (compras familiares, supermercado y ocio).
                </Text>

                <View style={[styles.dataBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <Text style={[styles.chartTitle, { color: colors.textMuted }]}>VOLUMEN DE GASTOS POR DÍA:</Text>
                  <View style={styles.barChartRow}>
                    {DAYS_OF_WEEK.map((item) => (
                      <View key={item.day} style={styles.barCol}>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${item.percentage * 3}%`,
                                backgroundColor: item.isTop ? colors.primary : '#475569',
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.barDayText,
                            { color: item.isTop ? colors.primary : colors.textSecondary, fontWeight: item.isTop ? '800' : '500' },
                          ]}
                        >
                          {item.day}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* 4. Comparison */}
            {type === 'comparison' && (
              <View style={styles.contentCol}>
                <Text style={[styles.bigVal, { color: '#10B981' }]}>-12% Ahorro</Text>
                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                  Excelente desempeño: Has gastado un 12% menos en comparación con el mismo ciclo del mes anterior.
                </Text>

                <View style={[styles.dataBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Mes Anterior (Agosto):</Text>
                    <Text style={[styles.dataValue, { color: colors.text }]}>RD$26,700</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Mes Actual (Septiembre):</Text>
                    <Text style={[styles.dataValue, { color: colors.primary }]}>
                      {formatCurrency(totalExpense, currencyCode)}
                    </Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>Diferencia a favor:</Text>
                    <Text style={[styles.dataValue, { color: colors.income }]}>
                      +{formatCurrency(Math.max(0, 26700 - totalExpense), currencyCode)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Pressable
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.closeBtnText}>Cerrar</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  scroll: {
    flexGrow: 0,
  },
  contentCol: {
    gap: 12,
  },
  bigVal: {
    fontSize: 26,
    fontWeight: '800',
  },
  descText: {
    fontSize: 13,
    lineHeight: 19,
  },
  dataBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12.5,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDayText: {
    fontSize: 11,
  },
  closeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  closeBtnText: {
    color: '#0D0C0A',
    fontWeight: '800',
    fontSize: 14,
  },
});
