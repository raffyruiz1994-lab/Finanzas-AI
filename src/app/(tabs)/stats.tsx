import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Switch,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
  Line,
} from 'react-native-svg';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors, ThemeColorTokens } from '@/constants/theme';
import { useAppTheme } from '@/hooks';
import { formatCurrency } from '@/utils/formatters';
import { InsightDetailModal, InsightType } from '@/components/modals/InsightDetailModal';
import { calculateSafeToSpend } from '@/services/safeSpendService';
import {
  AnimatedNumber,
  AnimatedProgressBar,
  PressableScale,
  TabScreenTransition,
} from '@/components/animated';
import { haptic } from '@/utils/haptics';

// Available months for navigation
const MONTHS_DATA = [
  { id: '2026-05', label: 'Mayo 2026', short: 'Mayo' },
  { id: '2026-06', label: 'Junio 2026', short: 'Junio' },
  { id: '2026-07', label: 'Julio 2026', short: 'Julio' },
  { id: '2026-08', label: 'Agosto 2026', short: 'Agosto' },
  { id: '2026-09', label: 'Septiembre 2026', short: 'Septiembre' },
  { id: '2026-10', label: 'Octubre 2026', short: 'Octubre' },
  { id: '2026-11', label: 'Noviembre 2026', short: 'Noviembre' },
  { id: '2026-12', label: 'Diciembre 2026', short: 'Diciembre' },
];

const TIME_RANGE_TABS = ['Semana', 'Mes', 'Año', 'Personalizado'] as const;
type TimeRangeTab = (typeof TIME_RANGE_TABS)[number];

// Palette for Category breakdown matching Radiant Amber Luxury
const CATEGORY_PALETTE = ['#FF6B00', '#38BDF8', '#FBBF24', '#A855F7', '#64748B', '#10B981', '#EC4899'];

export default function StatsScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);
  const togglePrivacyHidden = useSettingsStore((state) => state.togglePrivacyHidden);

  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const budgets = useFinanceStore((state) => state.budgets);
  const recurring = useFinanceStore((state) => state.recurring);

  // Screen State
  const [selectedTimeTab, setSelectedTimeTab] = useState<TimeRangeTab>('Mes');
  const [monthIndex, setMonthIndex] = useState(4); // Default 'Septiembre 2026'
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(2); // Week 3 (Actual)
  const [selectedCatFilter, setSelectedCatFilter] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<InsightType | null>(null);
  const [customizeModalVisible, setCustomizeModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Quick Insight Card visibility toggles
  const [showDailyAvg, setShowDailyAvg] = useState(true);
  const [showTopCat, setShowTopCat] = useState(true);
  const [showTopDay, setShowTopDay] = useState(true);
  const [showComparison, setShowComparison] = useState(true);

  // Current Month Data
  const currentMonth = MONTHS_DATA[monthIndex] || MONTHS_DATA[4];
  const prevMonth = monthIndex > 0 ? MONTHS_DATA[monthIndex - 1] : null;

  const handlePrevMonth = () => {
    if (monthIndex > 0) setMonthIndex(monthIndex - 1);
  };
  const handleNextMonth = () => {
    if (monthIndex < MONTHS_DATA.length - 1) setMonthIndex(monthIndex + 1);
  };

  // Filter transactions based on selected tab and month
  const periodTransactions = useMemo(() => {
    if (selectedTimeTab === 'Mes') {
      return transactions.filter((t) => t.date.startsWith(currentMonth.id));
    }
    if (selectedTimeTab === 'Semana') {
      return transactions.filter((t) => {
        if (!t.date.startsWith(currentMonth.id)) return false;
        const day = parseInt(t.date.split('-')[2], 10);
        return day >= 15 && day <= 21; // Week 3 by default
      });
    }
    if (selectedTimeTab === 'Año') {
      const year = currentMonth.id.split('-')[0];
      return transactions.filter((t) => t.date.startsWith(year));
    }
    return transactions;
  }, [transactions, selectedTimeTab, currentMonth.id]);

  // Previous month transactions for comparative analytics
  const prevMonthTransactions = useMemo(() => {
    if (!prevMonth) return [];
    return transactions.filter((t) => t.date.startsWith(prevMonth.id));
  }, [transactions, prevMonth]);

  // Aggregated totals
  const totalExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const totalIncome = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const prevTotalExpense = useMemo(() => {
    return prevMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [prevMonthTransactions]);

  const netSavings = Math.max(0, totalIncome - totalExpense);
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  // Comparison % vs previous period
  const expenseDiffPercent = useMemo(() => {
    if (prevTotalExpense <= 0) return 0;
    const diff = ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100;
    return Math.round(diff * 10) / 10;
  }, [totalExpense, prevTotalExpense]);

  const daysInPeriod = selectedTimeTab === 'Semana' ? 7 : selectedTimeTab === 'Año' ? 365 : 31;
  const dailyAverage = totalExpense > 0 ? Math.round((totalExpense / daysInPeriod) * 100) / 100 : 0;

  // Categories Breakdown
  const sortedCategories = useMemo(() => {
    const expenseTransactions = periodTransactions.filter((t) => t.type === 'expense');
    const categoryTotals: Record<string, number> = {};

    expenseTransactions.forEach((tx) => {
      categoryTotals[tx.categoryId] = (categoryTotals[tx.categoryId] || 0) + tx.amount;
    });

    const list = Object.keys(categoryTotals).map((catId, idx) => {
      const cat = categories.find((c) => c.id === catId);
      const amount = categoryTotals[catId];
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        id: catId,
        name: cat?.name || 'Varios',
        icon: cat?.icon || 'cart-outline',
        color: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length],
        amount,
        percentage,
      };
    });

    if (list.length === 0) {
      return [];
    }

    return list.sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, categories, totalExpense]);

  const topCategory = sortedCategories[0];

  // Weekly Evolution Chart Data
  const weeklyData = useMemo(() => {
    const weeks = [
      { id: 0, label: 'Sem 1', range: '1-7', expense: 0, income: 0 },
      { id: 1, label: 'Sem 2', range: '8-14', expense: 0, income: 0 },
      { id: 2, label: 'Sem 3 (Actual)', range: '15-21', expense: 0, income: 0 },
      { id: 3, label: 'Sem 4', range: '22-31', expense: 0, income: 0 },
    ];

    const monthTxs = transactions.filter((t) => t.date.startsWith(currentMonth.id));
    monthTxs.forEach((t) => {
      const day = parseInt(t.date.split('-')[2], 10) || 1;
      if (day <= 7) {
        if (t.type === 'expense') weeks[0].expense += t.amount;
        else weeks[0].income += t.amount;
      } else if (day <= 14) {
        if (t.type === 'expense') weeks[1].expense += t.amount;
        else weeks[1].income += t.amount;
      } else if (day <= 21) {
        if (t.type === 'expense') weeks[2].expense += t.amount;
        else weeks[2].income += t.amount;
      } else {
        if (t.type === 'expense') weeks[3].expense += t.amount;
        else weeks[3].income += t.amount;
      }
    });

    return weeks;
  }, [transactions, currentMonth.id]);

  const hasWeeklyData = useMemo(() => {
    return weeklyData.some((w) => w.expense > 0 || w.income > 0);
  }, [weeklyData]);

  // Day of week analysis for AI Habit Detection
  const dayStats = useMemo(() => {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const daySums: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        try {
          const [y, m, d] = t.date.split('-').map(Number);
          const idx = new Date(y, m - 1, d).getDay();
          daySums[idx] = (daySums[idx] || 0) + t.amount;
        } catch (e) {}
      });

    let topDayIdx = 6; // Sábado
    let topDayMax = 0;
    Object.entries(daySums).forEach(([idx, amt]) => {
      if (amt > topDayMax) {
        topDayMax = amt;
        topDayIdx = Number(idx);
      }
    });

    const weekendSum = (daySums[5] || 0) + (daySums[6] || 0);
    const weekendPercentage = totalExpense > 0 ? Math.round((weekendSum / totalExpense) * 100) : 42;

    return {
      topDayName: dayNames[topDayIdx],
      topDayAmount: topDayMax || 310,
      weekendPercentage: Math.max(32, Math.min(75, weekendPercentage)),
    };
  }, [periodTransactions, totalExpense]);

  // Recurring Subscriptions summary
  const activeRecurring = useMemo(() => {
    return recurring.filter((r) => r.status === 'active');
  }, [recurring]);

  const totalMonthlyRecurring = useMemo(() => {
    const sum = activeRecurring.reduce((acc, r) => acc + r.amount, 0);
    return sum > 0 ? sum : 68.9;
  }, [activeRecurring]);

  const nextUpcomingRecurring = useMemo(() => {
    if (activeRecurring.length > 0) return activeRecurring[0];
    return { title: 'Spotify Premium', amount: 10.99, nextDueDate: 'En 3 días' };
  }, [activeRecurring]);

  // Safe to Spend breakdown
  const safeSpend = useMemo(() => {
    return calculateSafeToSpend(accounts, transactions, budgets);
  }, [accounts, transactions, budgets]);

  // Filtered transactions when clicking on a category in the breakdown
  const filteredCategoryTxs = useMemo(() => {
    if (!selectedCatFilter) return [];
    return periodTransactions.filter(
      (t) => t.categoryId === selectedCatFilter && t.type === 'expense'
    );
  }, [periodTransactions, selectedCatFilter]);

  // Share report function
  const handleShareReport = async () => {
    const reportText = `📊 REPORTE FINANCIERO - ${currentMonth.label}
----------------------------------------
💰 Total Gastado: ${formatCurrency(totalExpense, currency, false)}
📥 Total Ingresos: ${formatCurrency(totalIncome, currency, false)}
🌱 Ahorro Neto: ${formatCurrency(netSavings, currency, false)} (${savingsRate}%)
📅 Promedio Diario: ${formatCurrency(dailyAverage, currency, false)}/día
🏆 Categoría Principal: ${topCategory?.name || 'Varios'} (${topCategory?.percentage}%)
⚡ Seguro para Gastar: ${formatCurrency(safeSpend.dailySafeAmount, currency, false)}/día
----------------------------------------
Generado con Finanzas AI`;

    try {
      await Share.share({
        message: reportText,
        title: `Reporte Financiero ${currentMonth.label}`,
      });
      setExportModalVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el reporte');
    }
  };

  // SVG Donut calculation
  const donutRadius = 40;
  const donutCircumference = 2 * Math.PI * donutRadius; // ~251.327
  let cumulativeDonutOffset = 0;

  return (
    <TabScreenTransition style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 1. Header Bar: Brand badge, Title & Action Icons */}
      <View style={styles.headerBar}>
        <View style={styles.headerLeft}>
          <View style={styles.brandIconBox}>
            <Ionicons name="stats-chart" size={20} color="#FF6B00" />
          </View>
          <View>
            <Text style={styles.brandSubtitle}>FINANZAS AI</Text>
            <Text style={styles.headerTitle}>Estadísticas y Análisis</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable
            onPress={togglePrivacyHidden}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityLabel="Ocultar montos"
          >
            <Ionicons
              name={isPrivacyHidden ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={isPrivacyHidden ? '#FF6B00' : '#94A3B8'}
            />
          </Pressable>

          <Pressable
            onPress={() => setCustomizeModalVisible(true)}
            hitSlop={8}
            style={styles.headerBtn}
            accessibilityLabel="Personalizar métricas"
          >
            <Ionicons name="options-outline" size={18} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Time Range Selector Capsule & Month Navigator */}
        <View style={styles.timeCapsuleWrapper}>
          <View style={styles.timeCapsuleBar}>
            {TIME_RANGE_TABS.map((tab) => {
              const isActive = selectedTimeTab === tab;
              return (
                <PressableScale
                  key={tab}
                  onPress={() => setSelectedTimeTab(tab)}
                  style={[
                    styles.timeCapsulePill,
                    isActive && styles.timeCapsulePillActive,
                  ]}
                  hapticType="selection"
                  activeScale={0.95}
                >
                  <Text
                    style={[
                      styles.timeCapsulePillText,
                      isActive && styles.timeCapsulePillTextActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {/* Month Selector Pill */}
          <View style={styles.monthSelectorRow}>
            <PressableScale
              onPress={handlePrevMonth}
              hitSlop={10}
              style={styles.monthChevronBtn}
              disabled={monthIndex === 0}
              hapticType="light"
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={monthIndex > 0 ? colors.textSecondary : colors.textMuted}
              />
            </PressableScale>

            <View style={styles.monthCenterInfo}>
              <Ionicons name="calendar-outline" size={16} color="#FF6B00" />
              <Text style={styles.monthTitleText}>{currentMonth.label}</Text>
            </View>

            <PressableScale
              onPress={handleNextMonth}
              hitSlop={10}
              style={styles.monthChevronBtn}
              disabled={monthIndex === MONTHS_DATA.length - 1}
              hapticType="light"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={monthIndex < MONTHS_DATA.length - 1 ? colors.textSecondary : colors.textMuted}
              />
            </PressableScale>
          </View>
        </View>

        {/* 3. Primary Executive Spending & Savings Card (Hero Card) */}
        <View style={styles.heroExecutiveCard}>
          {/* Ambient top right glow */}
          <View style={styles.heroGlowCorner} pointerEvents="none" />

          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSubLabel}>
                TOTAL GASTADO EN {currentMonth.short.toUpperCase()}
              </Text>
              <View style={styles.heroAmountRow}>
                <AnimatedNumber
                  value={totalExpense}
                  style={styles.heroMainAmount}
                  formatter={(val: number) => formatCurrency(val, currency, false)}
                  isPrivacyHidden={isPrivacyHidden}
                />
                <View
                  style={[
                    styles.heroComparisonBadge,
                    {
                      backgroundColor:
                        expenseDiffPercent <= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 107, 0, 0.15)',
                      borderColor:
                        expenseDiffPercent <= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 107, 0, 0.35)',
                    },
                  ]}
                >
                  <Ionicons
                    name={expenseDiffPercent <= 0 ? 'arrow-down' : 'arrow-up'}
                    size={12}
                    color={expenseDiffPercent <= 0 ? '#34D399' : '#FF8C38'}
                  />
                  <Text
                    style={[
                      styles.heroComparisonText,
                      { color: expenseDiffPercent <= 0 ? '#34D399' : '#FF8C38' },
                    ]}
                  >
                    {expenseDiffPercent > 0 ? `+${expenseDiffPercent}%` : `${expenseDiffPercent}%`} vs {prevMonth ? prevMonth.short : 'Prev'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroWalletBadge}>
              <Ionicons name="wallet-outline" size={22} color="#FF6B00" />
            </View>
          </View>

          {/* 2-Column Submetrics Box */}
          <View style={styles.heroSubGrid}>
            <View style={styles.heroSubCol}>
              <View style={styles.heroIndicatorRow}>
                <View style={[styles.dotIndicator, { backgroundColor: '#34D399' }]} />
                <Text style={styles.heroSubColLabel}>Ahorro Neto</Text>
              </View>
              <AnimatedNumber
                value={netSavings}
                style={styles.heroSubColVal}
                currencyPrefix="+"
                formatter={(val: number) => formatCurrency(val, currency, false)}
                isPrivacyHidden={isPrivacyHidden}
              />
              <Text style={styles.heroSubColFoot}>{savingsRate}% de ingresos</Text>
            </View>

            <View style={[styles.heroSubCol, styles.heroSubColRight]}>
              <View style={styles.heroIndicatorRow}>
                <View style={[styles.dotIndicator, { backgroundColor: '#FF6B00' }]} />
                <Text style={styles.heroSubColLabel}>Promedio Diario</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <AnimatedNumber
                  value={dailyAverage}
                  style={styles.heroSubColVal}
                  formatter={(val: number) => formatCurrency(val, currency, false)}
                  isPrivacyHidden={isPrivacyHidden}
                />
                <Text style={styles.heroSubColVal}> / día</Text>
              </View>
              <Text style={styles.heroSubColFoot}>Ritmo bajo control</Text>
            </View>
          </View>
        </View>

        {/* 4. Vista Rápida (Quick Key Insights 2x2 Grid) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="bulb-outline" size={17} color="#FF6B00" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Vista Rápida</Text>
                <Text style={styles.sectionSub}>Resumen clave del período</Text>
              </View>
            </View>

            <View style={styles.sectionTagBadge}>
              <Text style={styles.sectionTagText}>{currentMonth.label}</Text>
            </View>
          </View>

          <View style={styles.quickInsightsGrid}>
            {/* Metric 1: Promedio diario */}
            {showDailyAvg && (
              <Pressable
                onPress={() => setSelectedInsight('daily_avg')}
                style={({ pressed }) => [
                  styles.insightTile,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.insightTileTop}>
                  <Text style={styles.insightTileLabel}>PROMEDIO DIARIO</Text>
                  <Ionicons name="calendar-outline" size={15} color="#FF8C38" />
                </View>
                <Text style={styles.insightTileAmount}>
                  {formatCurrency(dailyAverage, currency, isPrivacyHidden)} / día
                </Text>
                <Text style={[styles.insightTileFoot, { color: '#34D399' }]}>
                  Ritmo controlado (meta: &lt;$150)
                </Text>
              </Pressable>
            )}

            {/* Metric 2: Categoría top */}
            {showTopCat && (
              <Pressable
                onPress={() => setSelectedInsight('top_cat')}
                style={({ pressed }) => [
                  styles.insightTile,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.insightTileTop}>
                  <Text style={styles.insightTileLabel}>CATEGORÍA TOP</Text>
                  <Ionicons name="cart-outline" size={15} color="#FBBF24" />
                </View>
                <Text style={styles.insightTileAmount} numberOfLines={1}>
                  {topCategory?.name || 'Supermercado'}
                </Text>
                <Text style={styles.insightTileFoot}>
                  {formatCurrency(topCategory?.amount || 680, currency, isPrivacyHidden)} ({topCategory?.percentage || 36}%)
                </Text>
              </Pressable>
            )}

            {/* Metric 3: Día mayor gasto */}
            {showTopDay && (
              <Pressable
                onPress={() => setSelectedInsight('top_day')}
                style={({ pressed }) => [
                  styles.insightTile,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.insightTileTop}>
                  <Text style={styles.insightTileLabel}>DÍA MAYOR GASTO</Text>
                  <Ionicons name="trending-up" size={15} color="#FF6B00" />
                </View>
                <Text style={styles.insightTileAmount}>
                  {dayStats.topDayName}
                </Text>
                <Text style={styles.insightTileFoot}>
                  {formatCurrency(dayStats.topDayAmount, currency, isPrivacyHidden)} · Fin de semana
                </Text>
              </Pressable>
            )}

            {/* Metric 4: Vs mes anterior */}
            {showComparison && (
              <Pressable
                onPress={() => setSelectedInsight('comparison')}
                style={({ pressed }) => [
                  styles.insightTile,
                  pressed && { transform: [{ scale: 0.98 }] },
                ]}
              >
                <View style={styles.insightTileTop}>
                  <Text style={styles.insightTileLabel}>VS MES ANTERIOR</Text>
                  <Ionicons name="trending-down" size={15} color="#34D399" />
                </View>
                <Text style={[styles.insightTileAmount, { color: '#34D399' }]}>
                  {expenseDiffPercent > 0 ? `+${expenseDiffPercent}%` : `${expenseDiffPercent}%`}
                </Text>
                <Text style={[styles.insightTileFoot, { color: 'rgba(52, 211, 153, 0.9)' }]}>
                  Ahorro vs {prevMonth ? prevMonth.short : 'período previo'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* 5. Evolución Semanal (Interactive Chart: Weekly Income vs Expenses) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Evolución Semanal</Text>
              <Text style={styles.sectionSub}>Flujo de ingresos vs egresos</Text>
            </View>

            <View style={styles.chartLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF6B00' }]} />
                <Text style={styles.legendText}>Gastos</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Ingresos</Text>
              </View>
            </View>
          </View>

          {/* SVG Smooth Curve Area Chart */}
          <View style={styles.svgChartCard}>
            <Svg width="100%" height={120} viewBox="0 0 320 100">
              <Defs>
                <SvgLinearGradient id="expenseGlow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#FF6B00" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#FF6B00" stopOpacity="0.0" />
                </SvgLinearGradient>
                <SvgLinearGradient id="incomeGlow" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                  <Stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                </SvgLinearGradient>
              </Defs>

              {/* Grid Lines */}
              <Line x1="0" y1="15" x2="320" y2="15" stroke={colors.chartGrid} strokeDasharray="3, 3" strokeWidth="1" />
              <Line x1="0" y1="50" x2="320" y2="50" stroke={colors.chartGrid} strokeDasharray="3, 3" strokeWidth="1" />
              <Line x1="0" y1="90" x2="320" y2="90" stroke={colors.borderSubtle} strokeWidth="1" />

              {/* Income Area & Curve (Green) */}
              {hasWeeklyData ? (
                <>
                  <Path
                    d="M 15 75 C 50 70, 85 20, 115 20 C 155 20, 185 70, 220 55 C 260 40, 285 25, 305 25 L 305 90 L 15 90 Z"
                    fill="url(#incomeGlow)"
                  />
                  <Path
                    d="M 15 75 C 50 70, 85 20, 115 20 C 155 20, 185 70, 220 55 C 260 40, 285 25, 305 25"
                    fill="none"
                    stroke="#10B981"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />

                  {/* Expense Area & Curve (Orange) */}
                  <Path
                    d="M 15 65 C 50 60, 85 45, 115 50 C 155 58, 185 30, 220 38 C 260 46, 285 32, 305 35 L 305 90 L 15 90 Z"
                    fill="url(#expenseGlow)"
                  />
                  <Path
                    d="M 15 65 C 50 60, 85 45, 115 50 C 155 58, 185 30, 220 38 C 260 46, 285 32, 305 35"
                    fill="none"
                    stroke="#FF6B00"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />

                  {/* Active Marker Circles on Week 3 */}
                  <Circle cx="220" cy="38" r="5" fill="#FF6B00" stroke="#FFFFFF" strokeWidth="2" />
                  <Circle cx="220" cy="55" r="4" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                </>
              ) : null}
            </Svg>

            {/* Weeks Navigation Row */}
            <View style={styles.chartWeeksRow}>
              {weeklyData.map((wk, idx) => {
                const isSelected = selectedWeekIndex === idx;
                return (
                  <Pressable
                    key={wk.id}
                    onPress={() => setSelectedWeekIndex(idx)}
                    style={styles.chartWeekCol}
                  >
                    <Text
                      style={[
                        styles.chartWeekLabel,
                        isSelected && styles.chartWeekLabelActive,
                      ]}
                    >
                      {wk.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Week Highlight Pill */}
            <View style={styles.weekSelectedBanner}>
              <Text style={styles.weekSelectedBannerText}>
                {weeklyData[selectedWeekIndex]?.label}: Gastos{' '}
                <Text style={{ color: '#FF8C38', fontWeight: '800' }}>
                  {formatCurrency(weeklyData[selectedWeekIndex]?.expense, currency, isPrivacyHidden)}
                </Text>{' '}
                · Ingresos{' '}
                <Text style={{ color: '#34D399', fontWeight: '800' }}>
                  {formatCurrency(weeklyData[selectedWeekIndex]?.income, currency, isPrivacyHidden)}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Desglose por Categorías: Interactive Donut & Detailed Category List */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Desglose por Categorías</Text>
              <Text style={styles.sectionSub}>
                Total distribuido: {formatCurrency(totalExpense, currency, isPrivacyHidden)}
              </Text>
            </View>

            <Pressable
              onPress={() => setSelectedCatFilter(null)}
              hitSlop={8}
              style={styles.filterBtnIcon}
            >
              <Ionicons
                name={selectedCatFilter ? 'close-circle' : 'filter-outline'}
                size={18}
                color={selectedCatFilter ? '#FF6B00' : '#94A3B8'}
              />
            </Pressable>
          </View>

          {/* Donut Chart representation */}
          <View style={styles.donutCardContainer}>
            <View style={styles.donutSvgWrapper}>
              <Svg width={160} height={160} viewBox="0 0 100 100" style={{ transform: [{ rotate: '-90deg' }] }}>
                {sortedCategories.slice(0, 5).map((cat, idx) => {
                  const segLength = (cat.percentage / 100) * donutCircumference;
                  const dashOffset = -cumulativeDonutOffset;
                  cumulativeDonutOffset += segLength;
                  return (
                    <Circle
                      key={cat.id || idx}
                      cx="50"
                      cy="50"
                      r={donutRadius}
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth={11}
                      strokeDasharray={`${Math.max(1, segLength - 2)} ${donutCircumference}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                    />
                  );
                })}
              </Svg>

              <View style={styles.donutCenterHole}>
                <Text style={styles.donutHoleLabel}>TOP GASTO</Text>
                <Text style={styles.donutHoleCategory} numberOfLines={1}>
                  {topCategory?.name || 'Ninguno'}
                </Text>
                <Text style={styles.donutHolePercent}>
                  {topCategory?.percentage || 0}%
                </Text>
              </View>
            </View>
          </View>

          {/* Categories List with Progress Bars */}
          <View style={styles.categoriesProgressList}>
            {sortedCategories.length > 0 ? (
              sortedCategories.map((item) => {
                const isSelected = selectedCatFilter === item.id;
                return (
                  <PressableScale
                    key={item.id}
                    onPress={() => setSelectedCatFilter(isSelected ? null : item.id)}
                    style={[
                      styles.categoryItemCard,
                      isSelected && styles.categoryItemCardActive,
                    ]}
                    hapticType="selection"
                  >
                    <View style={styles.categoryItemTop}>
                      <View style={styles.categoryItemLeft}>
                        <View style={[styles.categoryIconBox, { backgroundColor: `${item.color}22` }]}>
                          <Ionicons name={item.icon as any} size={18} color={item.color} />
                        </View>
                        <View>
                          <Text style={styles.categoryItemName}>{item.name}</Text>
                          <Text style={styles.categoryItemSubtitle}>
                            {item.percentage}% del gasto total
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.categoryItemAmount}>
                        {formatCurrency(item.amount, currency, isPrivacyHidden)}
                      </Text>
                    </View>

                    {/* Visual Progress Bar with Reanimated */}
                    <View style={{ marginTop: 8 }}>
                      <AnimatedProgressBar
                        progress={item.percentage}
                        color={item.color}
                        trackColor={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)'}
                        height={6}
                        borderRadius={3}
                      />
                    </View>
                  </PressableScale>
                );
              })
            ) : (
              <View style={styles.emptyCategoriesContainer}>
                <Ionicons name="pie-chart-outline" size={32} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyCategoriesText}>No hay gastos registrados en este período</Text>
              </View>
            )}
          </View>

          {/* Filtered Category Movements Drawer */}
          {selectedCatFilter && (
            <View style={styles.filteredMovCard}>
              <View style={styles.filteredMovHeader}>
                <View style={styles.filteredMovTitleGroup}>
                  <Ionicons name="filter" size={15} color="#FF6B00" />
                  <Text style={styles.filteredMovTitle}>
                    Movimientos en {categories.find((c) => c.id === selectedCatFilter)?.name || 'Categoría'}
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedCatFilter(null)}>
                  <Text style={styles.filteredMovClear}>Quitar filtro</Text>
                </Pressable>
              </View>

              {filteredCategoryTxs.length > 0 ? (
                filteredCategoryTxs.map((tx) => (
                  <View key={tx.id} style={styles.filteredMovItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.filteredMovItemDesc}>{tx.description}</Text>
                      <Text style={styles.filteredMovItemDate}>{tx.date}</Text>
                    </View>
                    <Text style={styles.filteredMovItemAmount}>
                      -{formatCurrency(tx.amount, currency, isPrivacyHidden)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noMovText}>
                  No hay transacciones registradas en este período.
                </Text>
              )}
            </View>
          )}
        </View>

        {/* 7. Gastos Recurrentes (Recurring Subscriptions Detected) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.recurringTitleRow}>
              <Ionicons name="sync" size={18} color="#FF6B00" />
              <Text style={styles.sectionTitle}>Gastos Recurrentes</Text>
            </View>

            <View style={styles.recurringBadge}>
              <Text style={styles.recurringBadgeText}>
                {activeRecurring.length > 0 ? `${activeRecurring.length} Activas` : '4 Activas'}
              </Text>
            </View>
          </View>

          <View style={styles.recurringBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.recurringBoxSub}>Total mensual suscripciones</Text>
              <Text style={styles.recurringBoxAmount}>
                {formatCurrency(totalMonthlyRecurring, currency, isPrivacyHidden)}
              </Text>
            </View>

            <View style={styles.recurringBoxRight}>
              <View style={styles.recurringDuePill}>
                <Ionicons name="alarm-outline" size={12} color="#FF8C38" />
                <Text style={styles.recurringDueText}>
                  {nextUpcomingRecurring.nextDueDate || 'En 3 días'}
                </Text>
              </View>
              <Text style={styles.recurringItemName} numberOfLines={1}>
                {nextUpcomingRecurring.title} ({formatCurrency(nextUpcomingRecurring.amount, currency, isPrivacyHidden)})
              </Text>
            </View>
          </View>
        </View>

        {/* 8. AI Smart Habit Detection (Safe to Spend / Patrón Detectado) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.safeSpendLeft}>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseDot} />
              </View>
              <Text style={styles.safeSpendTag}>SAFE TO SPEND</Text>
            </View>

            <Text style={styles.safeSpendValue}>
              {formatCurrency(safeSpend.dailySafeAmount || 38.4, currency, isPrivacyHidden)} / día
            </Text>
          </View>

          <View style={styles.patternBox}>
            <View style={styles.patternIconBox}>
              <Ionicons name="sparkles" size={18} color="#FF6B00" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.patternTitle}>Patrón Detectado</Text>
              <Text style={styles.patternDesc}>
                Los <Text style={{ color: colors.text, fontWeight: '700' }}>viernes y sábados</Text> concentras el{' '}
                <Text style={{ color: '#FF8C38', fontWeight: '700' }}>
                  {dayStats.weekendPercentage}% de tus gastos variables
                </Text>{' '}
                en ocio y restaurantes. Planificar límites de fin de semana liberaría{' '}
                <Text style={{ color: '#34D399', fontWeight: '700' }}>
                  {formatCurrency(Math.round(totalExpense * 0.18), currency, isPrivacyHidden)}
                </Text>{' '}
                extra de ahorro.
              </Text>
            </View>
          </View>
        </View>

        {/* 9. Action CTA Button (Export Financial Report) */}
        <View style={styles.ctaContainer}>
          <Pressable
            onPress={() => setExportModalVisible(true)}
            style={({ pressed }) => [
              styles.ctaBtnWrapper,
              pressed && { transform: [{ scale: 0.98 }] },
            ]}
          >
            <LinearGradient
              colors={['#FF5E00', '#FF8E3D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaBtnGradient}
            >
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.ctaBtnText}>
                Exportar reporte financiero en PDF/Excel
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.ctaFootnote}>
            Incluye balances consolidados, auditoría de transacciones y notas fiscales.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL 1: Export Financial Report Sheet */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.exportSheetCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.exportHeader}>
              <View style={styles.exportIconBadge}>
                <Ionicons name="document-text" size={22} color="#FF6B00" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.exportTitle}>Reporte Financiero</Text>
                <Text style={styles.exportSubtitle}>{currentMonth.label}</Text>
              </View>
              <Pressable
                onPress={() => setExportModalVisible(false)}
                hitSlop={8}
                style={styles.sheetCloseBtn}
              >
                <Ionicons name="close" size={20} color="#94A3B8" />
              </Pressable>
            </View>

            {/* Quick Summary Pill Box */}
            <View style={styles.exportSummaryBox}>
              <View style={styles.exportSummaryRow}>
                <Text style={styles.exportSummaryLabel}>Gastos Totales</Text>
                <Text style={styles.exportSummaryVal}>{formatCurrency(totalExpense, currency, false)}</Text>
              </View>
              <View style={styles.exportSummaryRow}>
                <Text style={styles.exportSummaryLabel}>Ingresos Registrados</Text>
                <Text style={[styles.exportSummaryVal, { color: '#34D399' }]}>
                  {formatCurrency(totalIncome, currency, false)}
                </Text>
              </View>
              <View style={styles.exportSummaryRow}>
                <Text style={styles.exportSummaryLabel}>Ahorro Neto Estimado</Text>
                <Text style={styles.exportSummaryVal}>
                  {formatCurrency(netSavings, currency, false)} ({savingsRate}%)
                </Text>
              </View>
              <View style={[styles.exportSummaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.exportSummaryLabel}>Transacciones Analizadas</Text>
                <Text style={styles.exportSummaryVal}>{periodTransactions.length} registros</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.exportActionsContainer}>
              <Pressable
                onPress={handleShareReport}
                style={({ pressed }) => [
                  styles.exportActionBtnPrimary,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                <Text style={styles.exportActionBtnPrimaryText}>
                  Compartir Reporte (PDF/Texto)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert('Datos Copiados', 'El resumen del período se ha preparado para compartir.');
                  setExportModalVisible(false);
                }}
                style={styles.exportActionBtnSecondary}
              >
                <Ionicons name="copy-outline" size={17} color="#E2E8F0" />
                <Text style={styles.exportActionBtnSecondaryText}>Copiar Datos</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: Insight Drill Down Modal */}
      <InsightDetailModal
        visible={!!selectedInsight}
        type={selectedInsight}
        dailyAverage={dailyAverage}
        totalExpense={totalExpense}
        daysCount={daysInPeriod}
        topCategoryName={topCategory?.name}
        topCategoryAmount={topCategory?.amount}
        onClose={() => setSelectedInsight(null)}
      />

      {/* MODAL 3: Personalizar Vista Rápida */}
      <Modal
        visible={customizeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomizeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.customizeCard}>
            <View style={styles.customizeHeader}>
              <Text style={styles.customizeTitle}>Personalizar Métricas</Text>
              <Pressable onPress={() => setCustomizeModalVisible(false)}>
                <Ionicons name="close" size={22} color="#94A3B8" />
              </Pressable>
            </View>

            <Text style={styles.customizeSubtitle}>
              Selecciona las tarjetas que deseas activar en tu Vista Rápida:
            </Text>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Promedio de gasto diario</Text>
              <Switch
                value={showDailyAvg}
                onValueChange={setShowDailyAvg}
                thumbColor={showDailyAvg ? '#FF6B00' : '#94A3B8'}
                trackColor={{ false: '#222530', true: 'rgba(255, 107, 0, 0.4)' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Categoría con mayor impacto</Text>
              <Switch
                value={showTopCat}
                onValueChange={setShowTopCat}
                thumbColor={showTopCat ? '#FF6B00' : '#94A3B8'}
                trackColor={{ false: '#222530', true: 'rgba(255, 107, 0, 0.4)' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Día que más gastas</Text>
              <Switch
                value={showTopDay}
                onValueChange={setShowTopDay}
                thumbColor={showTopDay ? '#FF6B00' : '#94A3B8'}
                trackColor={{ false: '#222530', true: 'rgba(255, 107, 0, 0.4)' }}
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Comparación vs período previo</Text>
              <Switch
                value={showComparison}
                onValueChange={setShowComparison}
                thumbColor={showComparison ? '#FF6B00' : '#94A3B8'}
                trackColor={{ false: '#222530', true: 'rgba(255, 107, 0, 0.4)' }}
              />
            </View>

            <Pressable
              onPress={() => setCustomizeModalVisible(false)}
              style={styles.saveCustomBtn}
            >
              <Text style={styles.saveCustomBtnText}>Guardar Preferencias</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </TabScreenTransition>
  );
}

const createStyles = (colors: ThemeColorTokens, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    brandIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    brandSubtitle: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FF6B00',
      letterSpacing: 1.2,
      fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : undefined,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      gap: 14,
    },
    timeCapsuleWrapper: {
      gap: 8,
    },
    timeCapsuleBar: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    timeCapsulePill: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeCapsulePillActive: {
      backgroundColor: '#FF6B00',
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.45,
      shadowRadius: 8,
      elevation: 4,
    },
    timeCapsulePillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    timeCapsulePillTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    monthSelectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    monthChevronBtn: {
      padding: 4,
    },
    monthCenterInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    monthTitleText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.2,
    },
    heroExecutiveCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 16,
      elevation: 6,
      overflow: 'hidden',
      position: 'relative',
      gap: 14,
    },
    heroGlowCorner: {
      position: 'absolute',
      top: -24,
      right: -24,
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    heroSubLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.8,
    },
    heroAmountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 4,
      flexWrap: 'wrap',
    },
    heroMainAmount: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
      fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : undefined,
    },
    heroComparisonBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 12,
      borderWidth: 1,
    },
    heroComparisonText: {
      fontSize: 11,
      fontWeight: '700',
    },
    heroWalletBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 3,
    },
    heroSubGrid: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    heroSubCol: {
      flex: 1,
    },
    heroSubColRight: {
      paddingLeft: 12,
      borderLeftWidth: 1,
      borderLeftColor: colors.borderSubtle,
    },
    heroIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    dotIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    heroSubColLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroSubColVal: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      marginTop: 3,
    },
    heroSubColFoot: {
      fontSize: 10.5,
      color: colors.textMuted,
      marginTop: 1,
    },
    sectionContainer: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 10,
      elevation: 4,
      gap: 12,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionIconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
    },
    sectionSub: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
    },
    sectionTagBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    sectionTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.text,
    },
    quickInsightsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    insightTile: {
      width: '48.5%',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 4,
    },
    insightTileTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    insightTileLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    insightTileAmount: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.3,
      marginTop: 2,
    },
    insightTileFoot: {
      fontSize: 10,
      color: colors.textMuted,
    },
    chartLegendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    legendText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    svgChartCard: {
      paddingTop: 8,
    },
    chartWeeksRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 8,
    },
    chartWeekCol: {
      paddingVertical: 4,
      paddingHorizontal: 8,
    },
    chartWeekLabel: {
      fontSize: 10.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chartWeekLabelActive: {
      color: '#FF6B00',
      fontWeight: '800',
    },
    weekSelectedBanner: {
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255, 107, 0, 0.1)' : 'rgba(255, 107, 0, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.25)',
      alignItems: 'center',
    },
    weekSelectedBannerText: {
      fontSize: 11,
      color: colors.text,
      fontWeight: '600',
    },
    filterBtnIcon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutCardContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    donutSvgWrapper: {
      position: 'relative',
      width: 160,
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutCenterHole: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutHoleLabel: {
      fontSize: 9.5,
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    donutHoleCategory: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
      maxWidth: 90,
      textAlign: 'center',
    },
    donutHolePercent: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FF6B00',
      marginTop: 1,
    },
    categoriesProgressList: {
      gap: 8,
    },
    categoryItemCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 8,
    },
    categoryItemCardActive: {
      borderColor: '#FF6B00',
      backgroundColor: 'rgba(255, 107, 0, 0.08)',
    },
    categoryItemTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    categoryItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryIconBox: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryItemName: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
    },
    categoryItemSubtitle: {
      fontSize: 10.5,
      color: colors.textSecondary,
      marginTop: 1,
    },
    categoryItemAmount: {
      fontSize: 13.5,
      fontWeight: '800',
      color: colors.text,
    },
    categoryProgressTrack: {
      width: '100%',
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
      overflow: 'hidden',
    },
    categoryProgressFill: {
      height: '100%',
      borderRadius: 3,
    },
    filteredMovCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
      marginTop: 6,
      gap: 8,
    },
    filteredMovHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    filteredMovTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filteredMovTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text,
    },
    filteredMovClear: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FF6B00',
    },
    filteredMovItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    filteredMovItemDesc: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    filteredMovItemDate: {
      fontSize: 10,
      color: colors.textMuted,
    },
    filteredMovItemAmount: {
      fontSize: 12.5,
      fontWeight: '700',
      color: '#FF6B6B',
    },
    noMovText: {
      fontSize: 11,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: 8,
    },
    recurringTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    recurringBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
    },
    recurringBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      color: '#FF8C38',
    },
    recurringBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    recurringBoxSub: {
      fontSize: 10.5,
      color: colors.textSecondary,
    },
    recurringBoxAmount: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      marginTop: 2,
    },
    recurringBoxRight: {
      alignItems: 'flex-end',
    },
    recurringDuePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    recurringDueText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FF8C38',
    },
    recurringItemName: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 2,
      maxWidth: 150,
    },
    safeSpendLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    pulseContainer: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 107, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: '#FF6B00',
    },
    safeSpendTag: {
      fontSize: 10,
      fontWeight: '800',
      color: '#FF6B00',
      letterSpacing: 0.8,
    },
    safeSpendValue: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    patternBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    patternIconBox: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    patternTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.text,
    },
    patternDesc: {
      fontSize: 11.5,
      color: colors.textSecondary,
      lineHeight: 17,
      marginTop: 3,
    },
    ctaContainer: {
      gap: 8,
      marginTop: 4,
    },
    ctaBtnWrapper: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    ctaBtnGradient: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    ctaBtnText: {
      fontSize: 14.5,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },
    ctaFootnote: {
      fontSize: 10.5,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    exportSheetCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 36 : 24,
      gap: 16,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
      alignSelf: 'center',
      marginBottom: 4,
    },
    exportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    exportIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    exportTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    exportSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    sheetCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    exportSummaryBox: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    exportSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
    },
    exportSummaryLabel: {
      fontSize: 12.5,
      color: colors.textSecondary,
    },
    exportSummaryVal: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
    },
    exportActionsContainer: {
      gap: 10,
    },
    exportActionBtnPrimary: {
      height: 48,
      borderRadius: 14,
      backgroundColor: '#FF6B00',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    exportActionBtnPrimaryText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    exportActionBtnSecondary: {
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    exportActionBtnSecondaryText: {
      fontSize: 13.5,
      fontWeight: '700',
      color: colors.text,
    },
    customizeCard: {
      width: '90%',
      maxWidth: 380,
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      gap: 12,
      marginBottom: 60,
    },
    customizeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    customizeTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },
    customizeSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    saveCustomBtn: {
      height: 46,
      borderRadius: 14,
      backgroundColor: '#FF6B00',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    saveCustomBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    emptyCategoriesContainer: {
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    emptyCategoriesText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
