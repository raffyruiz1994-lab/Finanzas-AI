import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';

import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAppTheme } from '@/hooks';
import { ThemeColorTokens } from '@/constants/theme';
import { CURRENCIES, Budget, Transaction, Category, SavingsGoal } from '@/types';
import { CrearPlanModal } from '@/components/planes/CrearPlanModal';
import { NuevoLimiteModal } from '@/components/planes/NuevoLimiteModal';
import { NuevaMetaModal } from '@/components/planes/NuevaMetaModal';
import { DetallePlanModal, PlanItem } from '@/components/planes/DetallePlanModal';
import { NearDueRecurringModal } from '@/components/modals/NearDueRecurringModal';
import { LoginModal } from '@/components/auth/LoginModal';
import {
  AnimatedNumber,
  AnimatedCard,
  AnimatedProgressBar,
  PressableScale,
  TabScreenTransition,
} from '@/components/animated';
import { haptic } from '@/utils/haptics';

const MONTH_NAMES_CAPITAL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface CircularGaugeProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
}

function CircularGauge({ percent, size = 64, strokeWidth = 4.5, trackColor = '#252A38' }: CircularGaugeProps) {
  const radius = 18;
  const viewBoxSize = 44;
  const circumference = 2 * Math.PI * radius; // 113.097
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const strokeDashoffset = circumference * (1 - clampedPercent / 100);

  const strokeColor =
    percent > 100
      ? '#EF4444'
      : percent >= 85
      ? '#F43F5E'
      : percent >= 70
      ? '#FF6800'
      : '#FF6800';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <Circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          originX="22"
          originY="22"
          rotation="-90"
        />
      </Svg>
      <View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
        ]}
        pointerEvents="none"
      >
        <Text style={{ fontSize: 13, fontWeight: '700', color: strokeColor }}>
          {clampedPercent}%
        </Text>
      </View>
    </View>
  );
}

export default function PresupuestosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  // Settings & Auth store
  const user = useSettingsStore((state) => state.user);
  const isGuest = useSettingsStore((state) => state.isGuest);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);
  const togglePrivacyHidden = useSettingsStore((state) => state.togglePrivacyHidden);
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);

  const isGuestMode = !user || isGuest || user.provider === 'guest';
  const displayName = isGuestMode
    ? 'Invitado'
    : user?.name?.trim() || (user?.email ? user.email.split('@')[0] : 'Usuario');

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleUserPress = () => {
    if (isGuestMode) {
      setLoginModalVisible(true);
    } else {
      router.push('/(tabs)/settings');
    }
  };

  // Finance store
  const budgets = useFinanceStore((state) => state.budgets);
  const goals = useFinanceStore((state) => state.goals);
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);
  const recurring = useFinanceStore((state) => state.recurring);
  const isCrearPlanModalOpen = useFinanceStore((state) => state.isCrearPlanModalOpen);
  const closeCrearPlanModal = useFinanceStore((state) => state.closeCrearPlanModal);

  // Filter between Todos | Presupuestos | Metas de Ahorro
  const [planFilter, setPlanFilter] = useState<'todos' | 'presupuestos' | 'metas'>('todos');

  // Date and Period filter state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [periodType, setPeriodType] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');

  // Modals state
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [crearPlanVisible, setCrearPlanVisible] = useState(false);
  const [nuevoLimiteVisible, setNuevoLimiteVisible] = useState(false);
  const [nuevaMetaVisible, setNuevaMetaVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);
  const [nearDueModalVisible, setNearDueModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  // Period label
  const currentPeriodTitle = `${MONTH_NAMES_CAPITAL[selectedMonth]} ${selectedYear}`;

  // Days remaining in period calculation
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const currentDay = isCurrentMonth ? now.getDate() : 1;
  const daysRemainingInMonth = isCurrentMonth ? Math.max(1, daysInMonth - currentDay) : daysInMonth;

  let periodDays = daysRemainingInMonth;
  let periodFactor = 1.0;

  if (periodType === 'biweekly') {
    periodFactor = 0.5;
    periodDays = Math.max(1, 15 - (currentDay % 15 || 15));
  } else if (periodType === 'weekly') {
    periodFactor = 0.25;
    periodDays = Math.max(1, 7 - (now.getDay() || 7));
  }

  // Currency configuration
  const currencySymbol = CURRENCIES[currency]?.symbol || '$';

  const formatAmount = (num: number) => {
    if (isPrivacyHidden) return '••••';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatAmountWhole = (num: number) => {
    if (isPrivacyHidden) return '••••';
    return Math.round(num).toLocaleString('en-US');
  };

  // Helper to categorize visual styling
  const getCategoryVisuals = (catName: string, categoryId?: string) => {
    const lower = `${catName} ${categoryId || ''}`.toLowerCase();

    if (
      lower.includes('comida') ||
      lower.includes('supermercado') ||
      lower.includes('mercado') ||
      lower.includes('alimento') ||
      lower.includes('groceries')
    ) {
      return {
        icon: 'cart',
        iconBg: 'rgba(255, 107, 0, 0.15)',
        iconBorder: 'rgba(255, 107, 0, 0.25)',
        iconColor: '#FF6B00',
      };
    }
    if (
      lower.includes('restaurante') ||
      lower.includes('café') ||
      lower.includes('cafe') ||
      lower.includes('bar') ||
      lower.includes('bebida')
    ) {
      return {
        icon: 'cafe',
        iconBg: 'rgba(255, 104, 0, 0.15)',
        iconBorder: 'rgba(255, 104, 0, 0.25)',
        iconColor: '#FF6800',
      };
    }
    if (
      lower.includes('transporte') ||
      lower.includes('gasolina') ||
      lower.includes('combustible') ||
      lower.includes('viaje') ||
      lower.includes('car')
    ) {
      return {
        icon: 'car',
        iconBg: 'rgba(59, 130, 246, 0.15)',
        iconBorder: 'rgba(59, 130, 246, 0.25)',
        iconColor: '#3B82F6',
      };
    }
    if (
      lower.includes('suscrip') ||
      lower.includes('servicio') ||
      lower.includes('netflix') ||
      lower.includes('spotify') ||
      lower.includes('luz') ||
      lower.includes('agua')
    ) {
      return {
        icon: 'play-circle',
        iconBg: 'rgba(168, 85, 247, 0.15)',
        iconBorder: 'rgba(168, 85, 247, 0.25)',
        iconColor: '#A855F7',
      };
    }
    if (
      lower.includes('ocio') ||
      lower.includes('diversión') ||
      lower.includes('diversion') ||
      lower.includes('juego') ||
      lower.includes('game') ||
      lower.includes('entretenimiento')
    ) {
      return {
        icon: 'game-controller',
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconBorder: 'rgba(16, 185, 129, 0.25)',
        iconColor: '#10B981',
      };
    }

    return {
      icon: 'wallet-outline',
      iconBg: 'rgba(255, 107, 0, 0.15)',
      iconBorder: 'rgba(255, 107, 0, 0.25)',
      iconColor: '#FF6B00',
    };
  };

  // Process user budgets from store
  const storeBudgetsList = useMemo(() => {
    return budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      const catTitle = b.name || cat?.name || 'Presupuesto';

      // Find expenses matching this category in selected month
      const catTxs = transactions.filter((tx) => {
        if (tx.type !== 'expense') return false;
        const txDate = new Date(tx.date);
        const isSameMonth =
          txDate.getFullYear() === selectedYear && txDate.getMonth() === selectedMonth;
        if (!isSameMonth) return false;

        return (
          tx.budgetId === b.id ||
          tx.categoryId === b.categoryId ||
          tx.categoryId === b.id ||
          (cat && tx.categoryId === cat.id) ||
          (b.name && tx.description && tx.description.toLowerCase().includes(b.name.toLowerCase())) ||
          (b.name && tx.subcategory && tx.subcategory.toLowerCase().includes(b.name.toLowerCase()))
        );
      });

      const spentFromTxs = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const rawSpent = (b.spent || 0) > 0 ? b.spent! : spentFromTxs;
      const scaledLimit = Math.max(1, Math.round(b.amount * periodFactor));
      const scaledSpent = Math.round(rawSpent * periodFactor);
      const remaining = Math.max(0, scaledLimit - scaledSpent);
      const percentage = Math.min(100, Math.round((scaledSpent / scaledLimit) * 100));

      const visuals = getCategoryVisuals(catTitle, b.categoryId);

      // Status text and colors
      let statusText = `Ritmo ideal · ${currencySymbol}${formatAmount(remaining)} rest.`;
      let statusColor = '#34D399';
      let barColor = '#34D399';

      if (scaledSpent >= scaledLimit) {
        statusText = 'Totalidad cubierta';
        statusColor = '#94A3B8';
        barColor = '#64748B';
      } else if (percentage >= 85) {
        statusText = `⚠️ Quedan ${currencySymbol}${formatAmount(remaining)}`;
        statusColor = '#FB7185';
        barColor = '#F43F5E';
      } else if (percentage >= 70) {
        statusText = `Ritmo ideal · ${currencySymbol}${formatAmount(remaining)} rest.`;
        statusColor = '#F59E0B';
        barColor = '#F59E0B';
      } else if (percentage >= 50) {
        statusText = `Bajo control · ${currencySymbol}${formatAmount(remaining)} rest.`;
        statusColor = '#38BDF8';
        barColor = '#FF6B00';
      } else {
        statusText = `Excelente ahorro · ${currencySymbol}${formatAmount(remaining)} rest.`;
        statusColor = '#34D399';
        barColor = '#10B981';
      }

      return {
        id: b.id,
        title: catTitle,
        spent: scaledSpent,
        limit: scaledLimit,
        remaining,
        percentage,
        icon: visuals.icon,
        iconBg: visuals.iconBg,
        iconBorder: visuals.iconBorder,
        iconColor: visuals.iconColor,
        statusText,
        statusColor,
        barColor,
        rawBudget: b,
      };
    });
  }, [
    budgets,
    categories,
    transactions,
    selectedMonth,
    selectedYear,
    periodFactor,
    currencySymbol,
    isPrivacyHidden,
  ]);

  // Display budgets: use real budgets configured in store
  const displayBudgets = storeBudgetsList;

  // Process savings goals from store with real saved calculations
  const processedGoals = useMemo(() => {
    return goals.map((g) => {
      const matchingGoalTxs = transactions.filter((tx) => {
        const isDirectMatch =
          tx.goalId === g.id || tx.categoryId === g.id || tx.categoryId === g.categoryId;
        const isTitleInDesc =
          g.title && tx.description && tx.description.toLowerCase().includes(g.title.toLowerCase());
        const isTitleInSub =
          g.title && tx.subcategory && tx.subcategory.toLowerCase() === g.title.toLowerCase();

        if (tx.categoryId === 'savings_goal' || tx.categoryId === 'savings') {
          if (isTitleInSub || isTitleInDesc) return true;
          if (
            goals.length === 1 ||
            g.id === 'goal_savings_main' ||
            g.title.toLowerCase().includes('meta de ahorro')
          ) {
            return true;
          }
        }
        return isDirectMatch || isTitleInDesc || isTitleInSub;
      });

      const txSavingsSum = matchingGoalTxs.reduce((sum, tx) => sum + tx.amount, 0);
      const currentAmount = Math.max(g.currentAmount || 0, txSavingsSum);
      const percentage =
        g.targetAmount > 0
          ? Math.min(100, Math.round((currentAmount / g.targetAmount) * 100))
          : 0;
      const remaining = Math.max(0, g.targetAmount - currentAmount);
      const isCompleted = currentAmount >= g.targetAmount;

      return {
        goal: { ...g, currentAmount, progressPercentage: percentage },
        id: g.id,
        title: g.title,
        icon: g.icon || 'disc-outline',
        color: g.color || '#14B8A6',
        currentAmount,
        targetAmount: g.targetAmount,
        remaining,
        percentage,
        isCompleted,
      };
    });
  }, [goals, transactions]);

  const totalTargetGoals = useMemo(() => {
    return processedGoals.reduce((acc, g) => acc + g.targetAmount, 0);
  }, [processedGoals]);

  const totalCurrentGoals = useMemo(() => {
    return processedGoals.reduce((acc, g) => acc + g.currentAmount, 0);
  }, [processedGoals]);

  const overallGoalsPercent =
    totalTargetGoals > 0
      ? Math.min(100, Math.round((totalCurrentGoals / totalTargetGoals) * 100))
      : 0;

  // Aggregate totals
  const totalLimit = useMemo(() => {
    return displayBudgets.reduce((acc, b) => acc + b.limit, 0);
  }, [displayBudgets]);

  const totalSpent = useMemo(() => {
    return displayBudgets.reduce((acc, b) => acc + b.spent, 0);
  }, [displayBudgets]);

  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallSpentPercent =
    totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
  const dailyBudget = periodDays > 0 ? totalRemaining / periodDays : 0;

  // Today & Near due recurring transactions
  const todayStr = new Date().toISOString().split('T')[0];
  const nearDueRecurring = useMemo(() => {
    return recurring.filter((r) => {
      if ((r.status || 'active') !== 'active') return false;
      if (r.lastAppliedDate === todayStr) return false;
      const due = (r.nextDueDate || '').toLowerCase();
      return (
        due.includes('mañana') ||
        due.includes('hoy') ||
        due.includes('pronto') ||
        r.frequency === 'daily' ||
        (r.dayOfMonth && Math.abs(r.dayOfMonth - new Date().getDate()) <= 2)
      );
    });
  }, [recurring, todayStr]);

  return (
    <TabScreenTransition style={styles.root}>
      {/* ======================================================== */}
      {/* 1. HEADER SUPERIOR CON IDENTIDAD RADIANTE               */}
      {/* ======================================================== */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 14) }]}>
        <LinearGradient
          colors={['rgba(255, 107, 0, 0.28)', 'rgba(255, 107, 0, 0.08)', colors.background]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={styles.headerContent}>
          {/* Logo y Nombre de Pantalla */}
          <View style={styles.brandRow}>
            <View style={styles.walletIconBox}>
              <Ionicons name="wallet" size={22} color="#FFA043" />
            </View>
            <View style={styles.brandTextCol}>
              <Text style={styles.brandCategorySub}>AURA FINANCE</Text>
              <Text style={styles.headerTitle}>Presupuestos</Text>
            </View>
          </View>

          {/* Acciones Derecha: Notificaciones + Perfil */}
          <View style={styles.headerRightActions}>
            <Pressable
              onPress={() => setNearDueModalVisible(true)}
              style={({ pressed }) => [
                styles.iconButtonRound,
                pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
              ]}
              hitSlop={8}
              accessibilityLabel="Notificaciones de programadas"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {nearDueRecurring.length > 0 && <View style={styles.notificationDot} />}
            </Pressable>

            <Pressable
              onPress={handleUserPress}
              style={({ pressed }) => [
                styles.avatarButtonRound,
                pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
              ]}
              hitSlop={8}
              accessibilityLabel="Ver perfil o ajustes"
            >
              {!isGuestMode && user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  style={styles.avatarImg}
                  contentFit="cover"
                />
              ) : !isGuestMode ? (
                <View style={styles.initialsBox}>
                  <Text style={styles.initialsText}>{getInitials(displayName)}</Text>
                </View>
              ) : (
                <View style={styles.guestBox}>
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* ======================================================== */}
      {/* 2. CUERPO PRINCIPAL CON SCROLL                          */}
      {/* ======================================================== */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Fila Controles: Selector de Mes */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setMonthPickerVisible(true)}
            style={({ pressed }) => [
              styles.monthSelectorBtn,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Text style={styles.monthTitleText}>{currentPeriodTitle}</Text>
            <Ionicons name="chevron-down" size={20} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Selector de Período: Mensual | Quincenal | Semanal */}
        <View style={styles.periodSegmentContainer}>
          {(['monthly', 'biweekly', 'weekly'] as const).map((p) => {
            const isActive = periodType === p;
            const label =
              p === 'monthly' ? 'Mensual' : p === 'biweekly' ? 'Quincenal' : 'Semanal';
            return (
              <Pressable
                key={p}
                onPress={() => setPeriodType(p)}
                style={[
                  styles.periodSegmentPill,
                  isActive && styles.periodSegmentPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodSegmentText,
                    isActive && styles.periodSegmentTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ======================================================== */}
        {/* 3. HERO CARD: CAPACIDAD TOTAL DE GASTO                   */}
        {/* ======================================================== */}
        <View style={styles.heroSummaryCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroSpentCol}>
              <Text style={styles.heroLabel}>CAPACIDAD TOTAL DE GASTO</Text>
              <View style={styles.heroAmountsRow}>
                <AnimatedNumber
                  value={totalSpent}
                  currencyPrefix={currencySymbol}
                  isPrivacyHidden={isPrivacyHidden}
                  formatter={(val: number) => `${currencySymbol}${formatAmountWhole(val)}`}
                  style={styles.heroSpentBig}
                />
                <Text style={styles.heroLimitSub}>{' '}/ </Text>
                <AnimatedNumber
                  value={totalLimit}
                  currencyPrefix={currencySymbol}
                  isPrivacyHidden={isPrivacyHidden}
                  formatter={(val: number) => `${currencySymbol}${formatAmountWhole(val)}`}
                  style={styles.heroLimitSub}
                />
              </View>
            </View>

            <CircularGauge
              percent={overallSpentPercent}
              size={64}
              strokeWidth={4.5}
              trackColor={isDark ? '#252A38' : '#E2E8F0'}
            />
          </View>

          {/* 2 Subtarjetas: Disponible y Días restantes */}
          <View style={styles.subcardsGrid}>
            {/* Subcard 1: Disponible */}
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Presupuesto Disponible',
                  `Tienes ${currencySymbol}${formatAmount(
                    totalRemaining
                  )} disponibles para gastar en este período (${
                    periodType === 'monthly'
                      ? 'Mensual'
                      : periodType === 'biweekly'
                      ? 'Quincenal'
                      : 'Semanal'
                  }).`
                );
              }}
              style={({ pressed }) => [
                styles.subcardBox,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.subcardOrangeIcon}>
                <Ionicons name="wallet-outline" size={20} color="#FF6B00" />
              </View>
              <View style={styles.subcardTextCol}>
                <Text style={styles.subcardLabel}>Disponible</Text>
                <Text style={styles.subcardValue} numberOfLines={1}>
                  {currencySymbol}
                  {formatAmount(totalRemaining)}
                </Text>
              </View>
            </Pressable>

            {/* Subcard 2: Días restantes & gasto diario recomendado */}
            <Pressable
              onPress={() => {
                Alert.alert(
                  'Ritmo de Gasto Diario',
                  `Restan ${periodDays} días en este período. Para cumplir tu presupuesto, tu gasto promedio recomendado es de ${currencySymbol}${formatAmount(
                    dailyBudget
                  )}/día.`
                );
              }}
              style={({ pressed }) => [
                styles.subcardBox,
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={styles.subcardAmberIcon}>
                <Ionicons name="calendar-outline" size={20} color="#FF6800" />
              </View>
              <View style={styles.subcardTextCol}>
                <Text style={styles.subcardLabel}>{periodDays} días rest.</Text>
                <Text style={styles.subcardValue} numberOfLines={1}>
                  {currencySymbol}
                  {formatAmount(dailyBudget)}
                  <Text style={styles.subcardValueUnit}>/d</Text>
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Footer de Estado de Ritmo */}
          <View style={styles.heroFooterRow}>
            <View style={styles.rhythmIndicatorRow}>
              <View
                style={[
                  styles.rhythmStatusDot,
                  {
                    backgroundColor:
                      overallSpentPercent > 100
                        ? '#F43F5E'
                        : overallSpentPercent >= 80
                        ? '#FF6800'
                        : '#34D399',
                  },
                ]}
              />
              <Text
                style={[
                  styles.rhythmStatusText,
                  {
                    color:
                      overallSpentPercent > 100
                        ? '#F43F5E'
                        : overallSpentPercent >= 80
                        ? '#FF6800'
                        : '#34D399',
                  },
                ]}
              >
                {overallSpentPercent > 100
                  ? 'Presupuesto excedido'
                  : overallSpentPercent >= 80
                  ? 'Alerta de consumo'
                  : 'Ritmo saludable'}
              </Text>
            </View>

            <Text style={styles.lastUpdatedText}>Actualizado hace 2m</Text>
          </View>
        </View>

        {/* ======================================================== */}
        {/* 4. FILTRO DE VISTA: TODOS | PRESUPUESTOS | METAS        */}
        {/* ======================================================== */}
        <View style={styles.planFilterContainer}>
          {(['todos', 'presupuestos', 'metas'] as const).map((filter) => {
            const isActive = planFilter === filter;
            const label =
              filter === 'todos'
                ? `Todos (${displayBudgets.length + processedGoals.length})`
                : filter === 'presupuestos'
                ? `Presupuestos (${displayBudgets.length})`
                : `Metas (${processedGoals.length})`;

            return (
              <Pressable
                key={filter}
                onPress={() => setPlanFilter(filter)}
                style={[
                  styles.planFilterPill,
                  isActive && styles.planFilterPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.planFilterText,
                    isActive && styles.planFilterTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ======================================================== */}
        {/* 5. SECCIÓN: CATEGORÍAS DE PRESUPUESTO                    */}
        {/* ======================================================== */}
        {(planFilter === 'todos' || planFilter === 'presupuestos') && (
          <View style={styles.categoriesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Categorías de Presupuesto</Text>
              <View style={styles.activePillBadge}>
                <Text style={styles.activePillText}>{displayBudgets.length} activas</Text>
              </View>
            </View>

            {displayBudgets.length > 0 ? (
              <View style={styles.budgetCardsList}>
                {displayBudgets.map((item) => {
                  const {
                    id,
                    title,
                    spent,
                    limit,
                    percentage,
                    icon,
                    iconBg,
                    iconBorder,
                    iconColor,
                    statusText,
                    statusColor,
                    barColor,
                    rawBudget,
                  } = item;

                  return (
                    <AnimatedCard
                      key={id}
                      onPress={() => {
                        if (rawBudget) {
                          setSelectedPlan({ type: 'budget', data: rawBudget });
                        } else {
                          setNuevoLimiteVisible(true);
                        }
                      }}
                      style={styles.budgetCategoryCard}
                      activeScale={0.98}
                      hapticType="selection"
                    >
                      {/* Fila superior: Icono + Nombre + Estado + Cantidades */}
                      <View style={styles.cardMainRow}>
                        <View style={styles.cardLeftCol}>
                          <View
                            style={[
                              styles.categoryIconBox,
                              { backgroundColor: iconBg, borderColor: iconBorder },
                            ]}
                          >
                            <Ionicons name={icon as any} size={20} color={iconColor} />
                          </View>

                          <View style={styles.categoryInfoCol}>
                            <Text style={styles.categoryNameText} numberOfLines={1}>
                              {title}
                            </Text>
                            <Text
                              style={[styles.categoryStatusText, { color: statusColor }]}
                              numberOfLines={1}
                            >
                              {statusText}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardRightAmounts}>
                          <Text style={styles.categorySpentAmount}>
                            {currencySymbol}
                            {formatAmountWhole(spent)}
                          </Text>
                          <Text style={styles.categoryLimitAmount}>
                            de {currencySymbol}
                            {formatAmountWhole(limit)}
                          </Text>
                        </View>
                      </View>

                      {/* Fila inferior: Barra de progreso Reanimated + Porcentaje */}
                      <View style={styles.progressBarWrapper}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <AnimatedProgressBar
                            progress={percentage}
                            color={barColor}
                            trackColor={isDark ? '#252A38' : '#E2E8F0'}
                            height={6}
                            borderRadius={3}
                          />
                        </View>
                        <Text style={[styles.progressPercentText, { color: barColor }]}>
                          {percentage}%
                        </Text>
                      </View>
                    </AnimatedCard>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyGoalsContainer}>
                <Ionicons name="pie-chart-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyGoalsTitle}>No tienes presupuestos activos</Text>
                <Text style={styles.emptyGoalsSub}>
                  Define límites de gasto por categoría para planificar mejor tu mes.
                </Text>
                <Pressable
                  onPress={() => setNuevoLimiteVisible(true)}
                  style={[styles.createGoalBtn, { backgroundColor: '#FF6800' }]}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={[styles.createGoalBtnText, { color: '#FFFFFF' }]}>Crear Presupuesto</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* 6. SECCIÓN: METAS DE AHORRO (Ahorrar para una meta)      */}
        {/* ======================================================== */}
        {(planFilter === 'todos' || planFilter === 'metas') && (
          <View style={styles.goalsSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithBadgeRow}>
                <Text style={styles.sectionTitle}>Metas de Ahorro</Text>
                <View style={styles.activePillBadgeTeal}>
                  <Text style={styles.activePillTextTeal}>{processedGoals.length} activas</Text>
                </View>
              </View>
            </View>

            {/* Banner Motivacional de Metas */}
            {processedGoals.length > 0 && (
              <View style={styles.motivationalGoalBanner}>
                <Text style={styles.motivationalGoalIcon}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.motivationalGoalTitle}>
                    {overallGoalsPercent}% completado de tus metas de ahorro
                  </Text>
                  <Text style={styles.motivationalGoalSubtitle}>
                    {currencySymbol}
                    {formatAmountWhole(totalCurrentGoals)} acumulados de {currencySymbol}
                    {formatAmountWhole(totalTargetGoals)}
                  </Text>
                </View>
              </View>
            )}

            {/* Lista de Tarjetas de Metas de Ahorro */}
            <View style={styles.budgetCardsList}>
              {processedGoals.map((item) => {
                const {
                  id,
                  title,
                  icon,
                  currentAmount,
                  targetAmount,
                  remaining,
                  percentage,
                  isCompleted,
                  goal,
                } = item;

                return (
                  <AnimatedCard
                    key={id}
                    onPress={() => setSelectedPlan({ type: 'goal', data: goal })}
                    style={styles.goalCard}
                    activeScale={0.98}
                    hapticType="selection"
                  >
                    {/* Fila superior: Icono + Nombre + Subtítulo + Cantidades */}
                    <View style={styles.cardMainRow}>
                      <View style={styles.cardLeftCol}>
                        <View style={styles.goalIconBox}>
                          <Ionicons name={icon as any} size={20} color="#34E4C5" />
                        </View>

                        <View style={styles.categoryInfoCol}>
                          <Text style={styles.categoryNameText} numberOfLines={1}>
                            {title}
                          </Text>
                          <Text
                            style={[
                              styles.categoryStatusText,
                              { color: isCompleted ? '#10B981' : '#34E4C5' },
                            ]}
                            numberOfLines={1}
                          >
                            {isCompleted
                              ? '¡Meta alcanzada con éxito! 🎉'
                              : `¡Faltan ${currencySymbol}${formatAmount(remaining)}!`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardRightAmounts}>
                        <Text style={styles.goalSavedAmount}>
                          {currencySymbol}
                          {formatAmountWhole(currentAmount)}
                        </Text>
                        <Text style={styles.goalTargetAmount}>
                          de {currencySymbol}
                          {formatAmountWhole(targetAmount)}
                        </Text>
                      </View>
                    </View>

                    {/* Fila inferior: Barra de progreso Reanimated + Porcentaje */}
                    <View style={styles.progressBarWrapper}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <AnimatedProgressBar
                          progress={percentage}
                          color={isCompleted ? '#10B981' : '#34E4C5'}
                          trackColor={isDark ? '#252A38' : '#E2E8F0'}
                          height={6}
                          borderRadius={3}
                        />
                      </View>
                      <Text
                        style={[
                          styles.goalProgressPercentText,
                          { color: isCompleted ? '#10B981' : '#34E4C5' },
                        ]}
                      >
                        {percentage}%
                      </Text>
                    </View>
                  </AnimatedCard>
                );
              })}

              {/* Si no tiene metas de ahorro aún */}
              {processedGoals.length === 0 && (
                <View style={styles.emptyGoalsContainer}>
                  <Ionicons name="disc-outline" size={38} color="#94A3B8" />
                  <Text style={styles.emptyGoalsTitle}>No tienes metas de ahorro aún</Text>
                  <Text style={styles.emptyGoalsSub}>
                    Presiona el botón central (+) para crear una meta o un límite de gasto.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Espaciador para la barra inferior */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ======================================================== */}
      {/* 7. MODALES INTERACTIVOS Y CONFIGURACIÓN                  */}
      {/* ======================================================== */}

      {/* Modal Selector de Período / Mes */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMonthPickerVisible(false)}
          />
          <View style={styles.monthPickerCard}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Seleccionar Período</Text>
              <Pressable
                onPress={() => setMonthPickerVisible(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Stepper de Año */}
            <View style={styles.yearStepperRow}>
              <Pressable
                onPress={() => setSelectedYear((y) => y - 1)}
                style={styles.yearNavBtn}
              >
                <Ionicons name="chevron-back" size={18} color="#FF6B00" />
              </Pressable>
              <Text style={styles.yearText}>{selectedYear}</Text>
              <Pressable
                onPress={() => setSelectedYear((y) => y + 1)}
                style={styles.yearNavBtn}
              >
                <Ionicons name="chevron-forward" size={18} color="#FF6B00" />
              </Pressable>
            </View>

            {/* Grid de Meses */}
            <View style={styles.monthsGrid}>
              {MONTH_NAMES_CAPITAL.map((mName, idx) => {
                const isSelected = selectedMonth === idx;
                const isCurrent =
                  idx === now.getMonth() && selectedYear === now.getFullYear();
                return (
                  <Pressable
                    key={mName}
                    onPress={() => {
                      setSelectedMonth(idx);
                      setMonthPickerVisible(false);
                    }}
                    style={[
                      styles.monthGridItem,
                      isSelected && styles.monthGridItemSelected,
                      isCurrent && !isSelected && styles.monthGridItemCurrent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthGridText,
                        isSelected && styles.monthGridTextSelected,
                        isCurrent && !isSelected && styles.monthGridTextCurrent,
                      ]}
                    >
                      {mName.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Botón Mes Actual */}
            <Pressable
              onPress={() => {
                setSelectedMonth(now.getMonth());
                setSelectedYear(now.getFullYear());
                setMonthPickerVisible(false);
              }}
              style={styles.resetToCurrentMonthBtn}
            >
              <Text style={styles.resetToCurrentMonthText}>Ir al Mes Actual</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal Crear Plan (Control de gasto o Meta de ahorro) */}
      <CrearPlanModal
        visible={crearPlanVisible || isCrearPlanModalOpen}
        onClose={() => {
          setCrearPlanVisible(false);
          closeCrearPlanModal();
        }}
        onSelectControlExpense={() => {
          setCrearPlanVisible(false);
          closeCrearPlanModal();
          setNuevoLimiteVisible(true);
        }}
        onSelectSaveGoal={() => {
          setCrearPlanVisible(false);
          closeCrearPlanModal();
          setNuevaMetaVisible(true);
        }}
      />

      {/* Modal Nuevo Límite de Gasto */}
      <NuevoLimiteModal
        visible={nuevoLimiteVisible}
        onClose={() => setNuevoLimiteVisible(false)}
      />

      {/* Modal Nueva Meta de Ahorro */}
      <NuevaMetaModal
        visible={nuevaMetaVisible}
        onClose={() => setNuevaMetaVisible(false)}
      />

      {/* Modal Detalle de Plan (Ver, aportar a meta, editar o eliminar) */}
      <DetallePlanModal
        plan={selectedPlan}
        visible={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />

      {/* Modal Notificaciones de Vencimiento */}
      <NearDueRecurringModal
        visible={nearDueModalVisible}
        onClose={() => setNearDueModalVisible(false)}
        onOpenAllRecurring={() => {
          setNearDueModalVisible(false);
          router.push('/(tabs)');
        }}
      />

      {/* Modal de Autenticación / Registro para Invitado */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        canDismiss={true}
      />
    </TabScreenTransition>
  );
}

const createStyles = (colors: ThemeColorTokens, isDark: boolean) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      position: 'relative',
      backgroundColor: isDark ? '#171A23' : colors.card,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255, 107, 0, 0.15)' : colors.borderSubtle,
      zIndex: 50,
      elevation: 8,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 10,
    },
    headerContent: {
      height: 60,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    walletIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(29, 25, 24, 0.85)' : 'rgba(255, 107, 0, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 3,
    },
    brandTextCol: {
      justifyContent: 'center',
    },
    brandCategorySub: {
      fontSize: 10,
      color: '#FF6800',
      fontWeight: '800',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconButtonRound: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notificationDot: {
      position: 'absolute',
      top: 9,
      right: 9,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#FF6B00',
      borderWidth: 1.5,
      borderColor: colors.card,
    },
    avatarButtonRound: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: 'rgba(255, 107, 0, 0.65)',
      overflow: 'hidden',
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    initialsBox: {
      width: '100%',
      height: '100%',
      backgroundColor: '#FF6B00',
      alignItems: 'center',
      justifyContent: 'center',
    },
    initialsText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: 14,
    },
    guestBox: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Scroll container */
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 24,
      gap: 18,
    },

    /* Controls row (Month + Nuevo) */
    controlsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthSelectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    monthTitleText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.3,
    },
    nuevoBtnWrapper: {
      borderRadius: 999,
      overflow: 'hidden',
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    nuevoBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 7,
      gap: 5,
    },
    nuevoBtnText: {
      color: '#FFFFFF',
      fontSize: 12.5,
      fontWeight: '700',
    },

    /* Segmented Period Tabs */
    periodSegmentContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: 12,
      padding: 3,
    },
    periodSegmentPill: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodSegmentPillActive: {
      backgroundColor: colors.surfaceSecondary,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 4,
      elevation: 2,
    },
    periodSegmentText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    periodSegmentTextActive: {
      color: '#FF6B00',
      fontWeight: '700',
    },

    /* Hero Card: Capacidad Total de Gasto */
    heroSummaryCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 18,
      gap: 16,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 14,
      elevation: 6,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroSpentCol: {
      gap: 4,
    },
    heroLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    heroAmountsRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    heroSpentBig: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    heroLimitSub: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },

    /* Subcards Grid */
    subcardsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    subcardBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 12,
    },
    subcardOrangeIcon: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subcardAmberIcon: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subcardTextCol: {
      flex: 1,
      justifyContent: 'center',
    },
    subcardLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    subcardValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    subcardValueUnit: {
      fontSize: 11,
      fontWeight: '400',
      color: colors.textMuted,
    },

    /* Hero Status Footer */
    heroFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
    },
    rhythmIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    rhythmStatusDot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
    },
    rhythmStatusText: {
      fontSize: 12,
      fontWeight: '600',
    },
    lastUpdatedText: {
      fontSize: 11,
      color: colors.textMuted,
    },

    /* Filter Pills Container */
    planFilterContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 3,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
    },
    planFilterPill: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planFilterPillActive: {
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.4)',
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 4,
      elevation: 2,
    },
    planFilterText: {
      fontSize: 11.5,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    planFilterTextActive: {
      color: colors.text,
      fontWeight: '700',
    },

    /* Categories Section */
    categoriesSection: {
      gap: 12,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    sectionTitleWithBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    activePillBadge: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    activePillText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.text,
    },
    activePillBadgeTeal: {
      backgroundColor: 'rgba(20, 184, 166, 0.12)',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(20, 184, 166, 0.3)',
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    activePillTextTeal: {
      fontSize: 11,
      fontWeight: '700',
      color: '#34E4C5',
    },

    /* Budget Cards List */
    budgetCardsList: {
      gap: 11,
    },
    budgetCategoryCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 14,
      gap: 12,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      elevation: 3,
    },
    cardMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardLeftCol: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minWidth: 0,
    },
    categoryIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    categoryInfoCol: {
      flex: 1,
      justifyContent: 'center',
      minWidth: 0,
    },
    categoryNameText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.2,
    },
    categoryStatusText: {
      fontSize: 11.5,
      fontWeight: '600',
      marginTop: 2,
    },
    cardRightAmounts: {
      alignItems: 'flex-end',
      paddingLeft: 8,
    },
    categorySpentAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    categoryLimitAmount: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    progressBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    progressTrack: {
      flex: 1,
      height: 7,
      borderRadius: 999,
      backgroundColor: isDark ? '#11141C' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    progressPercentText: {
      fontSize: 11.5,
      fontWeight: '700',
      minWidth: 32,
      textAlign: 'right',
    },

    /* Goals Section */
    goalsSection: {
      gap: 12,
    },
    goalPillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(20, 184, 166, 0.14)',
      borderWidth: 1,
      borderColor: 'rgba(20, 184, 166, 0.35)',
      paddingHorizontal: 10,
      paddingVertical: 4.5,
      borderRadius: 999,
    },
    goalPillBtnText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#34E4C5',
    },
    motivationalGoalBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(20, 184, 166, 0.28)',
      padding: 12,
    },
    motivationalGoalIcon: {
      fontSize: 22,
    },
    motivationalGoalTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#34E4C5',
    },
    motivationalGoalSubtitle: {
      fontSize: 11.5,
      color: colors.textSecondary,
      marginTop: 2,
    },
    goalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 14,
      gap: 12,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 6,
      elevation: 3,
    },
    goalIconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(20, 184, 166, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(20, 184, 166, 0.28)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    goalSavedAmount: {
      fontSize: 14,
      fontWeight: '700',
      color: '#34E4C5',
    },
    goalTargetAmount: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 1,
    },
    goalProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    goalProgressPercentText: {
      fontSize: 11.5,
      fontWeight: '700',
      minWidth: 32,
      textAlign: 'right',
    },
    emptyGoalsContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    emptyGoalsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginTop: 4,
    },
    emptyGoalsSub: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 17,
    },
    createGoalBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#34E4C5',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      marginTop: 6,
    },
    createGoalBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#0D0F15',
    },

    /* Month Picker Modal */
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    monthPickerCard: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: 20,
      gap: 16,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: colors.shadowOpacity,
      shadowRadius: 20,
      elevation: 10,
    },
    monthPickerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    monthPickerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    yearStepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surfaceSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    yearNavBtn: {
      padding: 4,
    },
    yearText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    monthsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'space-between',
    },
    monthGridItem: {
      width: '30%',
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.surfaceSecondary,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthGridItemSelected: {
      backgroundColor: '#FF6B00',
      borderColor: '#FF8A00',
    },
    monthGridItemCurrent: {
      borderColor: '#FF6B00',
    },
    monthGridText: {
      fontSize: 12.5,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    monthGridTextSelected: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    monthGridTextCurrent: {
      color: '#FF6B00',
    },
    resetToCurrentMonthBtn: {
      paddingVertical: 11,
      borderRadius: 10,
      backgroundColor: 'rgba(255, 107, 0, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(255, 107, 0, 0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    resetToCurrentMonthText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFA043',
    },
  });
