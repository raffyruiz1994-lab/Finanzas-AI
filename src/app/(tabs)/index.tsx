import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { CURRENCIES, Transaction, Category } from '@/types';
import { TransactionDetailModal } from '@/components/modals/TransactionDetailModal';
import { AIAssistantModal } from '@/components/modals/AIAssistantModal';
import { BudgetsModal } from '@/components/modals/BudgetsModal';
import { GoalsModal } from '@/components/modals/GoalsModal';
import { DebtsModal } from '@/components/modals/DebtsModal';
import { RecurringModal } from '@/components/modals/RecurringModal';
import { NearDueRecurringModal } from '@/components/modals/NearDueRecurringModal';
import { InfoExplainerModal } from '@/components/modals/InfoExplainerModal';
import { CategoryManagerModal } from '@/components/categories/CategoryManagerModal';
import { LoginModal } from '@/components/auth/LoginModal';
import { useUIStore } from '@/store/useUIStore';
import {
  AnimatedNumber,
  AnimatedCard,
  AnimatedProgressBar,
  AnimatedTransaction,
  PressableScale,
  MoneyArrivalBadge,
  ModernSearchBar,
  TabScreenTransition,
} from '@/components/animated';
import { haptic } from '@/utils/haptics';

const MONTH_NAMES = [
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

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  // Settings & Auth store
  const user = useSettingsStore((state) => state.user);
  const isGuest = useSettingsStore((state) => state.isGuest);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);
  const togglePrivacyHidden = useSettingsStore((state) => state.togglePrivacyHidden);
  const currency = useSettingsStore((state) => state.currency);
  const setCurrency = useSettingsStore((state) => state.setCurrency);

  // Authentication & Dynamic Greeting logic
  const isGuestMode = !user || isGuest || user.provider === 'guest';
  const displayName = isGuestMode
    ? 'Invitado'
    : user?.name?.trim() || (user?.email ? user.email.split('@')[0] : 'Usuario');

  const greeting = isGuestMode ? 'Hola' : 'Hola de nuevo';

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
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const budgets = useFinanceStore((state) => state.budgets);
  const categories = useFinanceStore((state) => state.categories);
  const recurring = useFinanceStore((state) => state.recurring);
  const openNewTxModal = useFinanceStore((state) => state.openNewTxModal);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [dismissScheduledBanner, setDismissScheduledBanner] = useState(false);

  // ScrollView Ref to smoothly scroll back to top when registering a transaction
  const scrollViewRef = useRef<any>(null);

  // Recently Registered Transaction Effect (from useUIStore)
  const lastRegisteredTx = useUIStore((state) => state.lastRegisteredTx);
  const clearRegisteredTxEffect = useUIStore((state) => state.clearRegisteredTxEffect);
  const [activeMoneyEffect, setActiveMoneyEffect] = useState<{
    id: string;
    type: 'income' | 'expense';
    amount: number;
    currency: string;
  } | null>(null);

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    if (lastRegisteredTx) {
      // 1. Smoothly scroll back to the very top so the orange card is fully visible!
      scrollToTop();

      // 2. Set active money effect for fluid animation
      setActiveMoneyEffect({
        id: lastRegisteredTx.id,
        type: lastRegisteredTx.type,
        amount: lastRegisteredTx.amount,
        currency: lastRegisteredTx.currency,
      });

      // Clear the trigger
      clearRegisteredTxEffect();
    }
  }, [lastRegisteredTx, clearRegisteredTxEffect]);

  // Sticky collapsible hero animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const isCollapsedRef = useRef(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const defaultHeroHeight = Math.max(insets.top + 8, 48) + 386;
  const [heroHeight, setHeroHeight] = useState(defaultHeroHeight);

  // Collapsed sticky header height: insets.top + mini stats row + search bar capsule + curved card bottom
  const collapsedHeaderHeight = Math.max(insets.top, 24) + 104;
  const maxScroll = Math.max(10, heroHeight - collapsedHeaderHeight);

  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const collapsed = value > maxScroll * 0.7;
      if (collapsed !== isCollapsedRef.current) {
        isCollapsedRef.current = collapsed;
        setIsCollapsed(collapsed);
      }
    });
    return () => {
      scrollY.removeListener(listenerId);
    };
  }, [maxScroll, scrollY]);

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, maxScroll],
    outputRange: [0, -maxScroll],
    extrapolate: 'clamp',
  });

  const topContentOpacity = scrollY.interpolate({
    inputRange: [0, maxScroll * 0.45, maxScroll * 0.75],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  // Mini stats row fades in and slides slightly down when collapsed
  const miniStatsOpacity = scrollY.interpolate({
    inputRange: [maxScroll * 0.55, maxScroll * 0.85],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const miniStatsTranslateY = scrollY.interpolate({
    inputRange: [maxScroll * 0.55, maxScroll * 0.85],
    outputRange: [6, 0],
    extrapolate: 'clamp',
  });

  const handleHeroLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 200 && Math.abs(h - heroHeight) > 1) {
      setHeroHeight(h);
    }
  };


  // Modals state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [budgetsModalVisible, setBudgetsModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [debtsModalVisible, setDebtsModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [nearDueModalVisible, setNearDueModalVisible] = useState(false);
  const [categoryManagerVisible, setCategoryManagerVisible] = useState(false);
  const [explainerType, setExplainerType] = useState<'available_balance' | 'safe_to_spend' | null>(null);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

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

  // Income, Expenses and Available Balance
  const totalIncome = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const totalExpense = useMemo(() => {
    return transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions]);

  const availableBalance = useMemo(() => {
    if (accounts && accounts.length > 0) {
      return accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
    }
    return totalIncome - totalExpense;
  }, [accounts, totalIncome, totalExpense]);

  // Last expense calculation
  const lastExpense = useMemo(() => {
    const expense = transactions.find((t) => t.type === 'expense');
    return expense || null;
  }, [transactions]);

  // Days remaining in current month
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthlyIncome = useMemo(() => {
    const list = transactions.filter(
      (tx) => tx.type === 'income' && (tx.date || '').startsWith(currentYearMonth)
    );
    return list.reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions, currentYearMonth]);

  const monthlyExpense = useMemo(() => {
    const list = transactions.filter(
      (tx) => tx.type === 'expense' && (tx.date || '').startsWith(currentYearMonth)
    );
    return list.reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions, currentYearMonth]);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate());
  const currentMonthName = MONTH_NAMES[now.getMonth()];

  // Budget calculations
  const totalBudgetLimit = useMemo(() => {
    return budgets.reduce((acc, b) => acc + (b.amount || 0), 0);
  }, [budgets]);

  const budgetSpent = useMemo(() => {
    return totalExpense;
  }, [totalExpense]);

  const budgetRemaining = useMemo(() => {
    return Math.max(0, totalBudgetLimit - budgetSpent);
  }, [totalBudgetLimit, budgetSpent]);

  const budgetSpentPercent = useMemo(() => {
    if (totalBudgetLimit <= 0) return 0;
    return Math.min(100, Math.round((budgetSpent / totalBudgetLimit) * 100));
  }, [budgetSpent, totalBudgetLimit]);

  // Currency configuration
  const currencySymbol = CURRENCIES[currency]?.symbol || '$';
  const currencyLabel = `${currency} (${currencySymbol})`;

  const toggleCurrency = () => {
    if (currency === 'USD') setCurrency('DOP');
    else if (currency === 'DOP') setCurrency('EUR');
    else setCurrency('USD');
  };

  // Filtered transactions for recent movements list
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) {
      return transactions.slice(0, 6);
    }
    const q = searchQuery.toLowerCase();
    return transactions.filter((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      return (
        tx.description.toLowerCase().includes(q) ||
        (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
        (cat && cat.name.toLowerCase().includes(q)) ||
        (tx.tags && tx.tags.some((tag) => tag.toLowerCase().includes(q))) ||
        (tx.notes && tx.notes.toLowerCase().includes(q))
      );
    });
  }, [transactions, categories, searchQuery]);

  // Helper to format currency
  const formatAmount = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Helper to format compact numbers (e.g. 103000 -> 103K, 10000 -> 10K, 17639 -> 17.6K)
  const formatCompactNumber = (num: number) => {
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000) {
      const formatted = (num / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${formatted}M`;
    }
    if (absNum >= 1_000) {
      const k = num / 1_000;
      const formatted =
        k >= 100
          ? Math.round(k).toString()
          : (Math.round(k * 10) / 10).toFixed(k % 1 === 0 ? 0 : 1).replace(/\.0$/, '');
      return `${formatted}K`;
    }
    return Math.round(num).toString();
  };

  // Helper to get category details
  const getCategoryInfo = (tx: Transaction) => {
    const cat = categories.find((c) => c.id === tx.categoryId);
    const catName = cat?.name || tx.subcategory || 'General';
    const isIncome = tx.type === 'income';

    let iconName: any = 'receipt';
    let iconBg = 'rgba(255, 107, 0, 0.15)';
    let iconBorder = 'rgba(255, 107, 0, 0.25)';
    let iconColor = '#FF6B00';

    if (isIncome) {
      iconName = 'arrow-down';
      iconBg = 'rgba(16, 185, 129, 0.15)';
      iconBorder = 'rgba(16, 185, 129, 0.25)';
      iconColor = '#10B981';
    } else if (tx.categoryId === 'food' || catName.toLowerCase().includes('comida') || catName.toLowerCase().includes('café') || catName.toLowerCase().includes('restaurante')) {
      iconName = 'cafe';
      iconBg = 'rgba(255, 107, 0, 0.15)';
      iconBorder = 'rgba(255, 107, 0, 0.25)';
      iconColor = '#FF6B00';
    } else if (tx.categoryId === 'transport' || catName.toLowerCase().includes('viaje') || catName.toLowerCase().includes('transporte')) {
      iconName = 'car';
      iconBg = 'rgba(59, 130, 246, 0.15)';
      iconBorder = 'rgba(59, 130, 246, 0.25)';
      iconColor = '#3B82F6';
    } else if (tx.categoryId === 'groceries' || catName.toLowerCase().includes('mercado') || catName.toLowerCase().includes('supermercado')) {
      iconName = 'cart';
      iconBg = 'rgba(255, 104, 0, 0.15)';
      iconBorder = 'rgba(255, 104, 0, 0.25)';
      iconColor = '#FF6800';
    } else if (catName.toLowerCase().includes('servicio') || catName.toLowerCase().includes('luz') || catName.toLowerCase().includes('agua')) {
      iconName = 'receipt';
      iconBg = 'rgba(16, 185, 129, 0.15)';
      iconBorder = 'rgba(16, 185, 129, 0.25)';
      iconColor = '#10B981';
    } else if (catName.toLowerCase().includes('suscrip') || catName.toLowerCase().includes('netflix') || catName.toLowerCase().includes('entretenimiento')) {
      iconName = 'play-circle';
      iconBg = 'rgba(168, 85, 247, 0.15)';
      iconBorder = 'rgba(168, 85, 247, 0.25)';
      iconColor = '#A855F7';
    }

    return { catName, isIncome, iconName, iconBg, iconBorder, iconColor };
  };

  return (
    <TabScreenTransition style={[styles.root, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        ref={scrollViewRef}
        style={[styles.scrollView, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.scrollContent, { paddingTop: heroHeight }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF6B00"
            progressViewOffset={heroHeight}
          />
        }
      >

        {/* ======================================================== */}
        {/* 2. CUERPO DEL DASHBOARD ADAPTATIVO (DARK / LIGHT)        */}
        {/* ======================================================== */}
        <View style={styles.bodyContent}>
          {/* Banner de Programadas Cercanas (si existen y no descartado) */}
          {!dismissScheduledBanner && nearDueRecurring.length > 0 && (
            <View style={[styles.scheduledBanner, { backgroundColor: isDark ? '#1C1530' : '#F5F3FF', borderColor: isDark ? 'rgba(168, 85, 247, 0.35)' : '#DDD6FE' }]}>
              <Pressable
                onPress={() => setNearDueModalVisible(true)}
                style={styles.scheduledBannerLeft}
              >
                <View style={styles.scheduledCalendarCircle}>
                  <Ionicons name="calendar" size={18} color="#C084FC" />
                  <View style={styles.scheduledRedDot} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scheduledBannerTitle, { color: colors.text }]}>
                    {nearDueRecurring.length}{' '}
                    {nearDueRecurring.length === 1
                      ? 'Transacción programada'
                      : 'Transacciones programadas'}
                  </Text>
                  <View style={styles.revisarRow}>
                    <Text style={styles.revisarText}>Revisar próximas a vencer</Text>
                    <Ionicons name="chevron-forward" size={13} color="#C084FC" />
                  </View>
                </View>
              </Pressable>

              <Pressable
                onPress={() => setDismissScheduledBanner(true)}
                hitSlop={10}
                style={styles.bannerCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          )}

          {/* Opciones de Gasto / Categorías Rápidas */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Opciones de Gasto</Text>
              <Pressable
                onPress={() => setCategoryManagerVisible(true)}
                hitSlop={10}
              >
                <Text style={styles.linkOrange}>Ver todo</Text>
              </Pressable>
            </View>

            <View style={styles.expenseOptionsGrid}>
              {/* Tarjeta 1: Comida */}
              <PressableScale
                onPress={() => openNewTxModal('food')}
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                hapticType="selection"
              >
                <View
                  style={[
                    styles.optionIconBox,
                    {
                      backgroundColor: 'rgba(255, 107, 0, 0.15)',
                      borderColor: 'rgba(255, 107, 0, 0.25)',
                    },
                  ]}
                >
                  <Ionicons name="restaurant" size={20} color="#FF6B00" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Comida</Text>
              </PressableScale>

              {/* Tarjeta 2: Viajes */}
              <PressableScale
                onPress={() => openNewTxModal('transport')}
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                hapticType="selection"
              >
                <View
                  style={[
                    styles.optionIconBox,
                    {
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      borderColor: 'rgba(59, 130, 246, 0.25)',
                    },
                  ]}
                >
                  <Ionicons name="car" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Viajes</Text>
              </PressableScale>

              {/* Tarjeta 3: Mercado */}
              <PressableScale
                onPress={() => openNewTxModal('groceries')}
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                hapticType="selection"
              >
                <View
                  style={[
                    styles.optionIconBox,
                    {
                      backgroundColor: 'rgba(255, 104, 0, 0.15)',
                      borderColor: 'rgba(255, 104, 0, 0.25)',
                    },
                  ]}
                >
                  <Ionicons name="cart" size={20} color="#FF6800" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Mercado</Text>
              </PressableScale>

              {/* Tarjeta 4: Servicios */}
              <PressableScale
                onPress={() => openNewTxModal('home')}
                style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                hapticType="selection"
              >
                <View
                  style={[
                    styles.optionIconBox,
                    {
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                    },
                  ]}
                >
                  <Ionicons name="receipt" size={20} color="#10B981" />
                </View>
                <Text style={[styles.optionText, { color: colors.text }]}>Servicios</Text>
              </PressableScale>
            </View>
          </View>

          {/* Presupuesto Mensual Resumen */}
          <AnimatedCard
            onPress={() => setBudgetsModalVisible(true)}
            style={[styles.budgetCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            delay={100}
            activeScale={0.985}
            hapticType="selection"
          >
            <View style={styles.budgetTopRow}>
              <View style={styles.budgetTitleGroup}>
                <View style={styles.budgetDonutIconBox}>
                  <Ionicons name="pie-chart" size={18} color="#FF6B00" />
                </View>
                <View>
                  <Text style={[styles.budgetName, { color: colors.text }]}>
                    Presupuesto {currentMonthName}
                  </Text>
                  <Text style={[styles.budgetLimitSubtext, { color: colors.textSecondary }]}>
                    Límite mensual: {currencySymbol}{formatAmount(totalBudgetLimit)}
                  </Text>
                </View>
              </View>

              <View style={styles.budgetPercentCol}>
                <Text style={[styles.budgetPercentText, { color: colors.text }]}>
                  {isPrivacyHidden ? '•••' : `${budgetSpentPercent}%`}
                </Text>
                <Text style={[styles.budgetGastadoBadge, { backgroundColor: colors.backgroundSubtle, color: colors.textSecondary }]}>GASTADO</Text>
              </View>
            </View>

            {/* Barra de Progreso Fluida con Reanimated */}
            <View style={{ marginVertical: 12 }}>
              <AnimatedProgressBar
                progress={budgetSpentPercent}
                color={budgetSpentPercent > 90 ? colors.expense : colors.primary}
                trackColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'}
                height={8}
                borderRadius={4}
              />
            </View>

            {/* Métricas Inferiores: Gastado vs Restante */}
            <View style={styles.budgetFooterRow}>
              <View style={styles.budgetMetricItem}>
                <View style={[styles.statusDotSmall, { backgroundColor: '#FF6B00' }]} />
                <Text style={[styles.budgetMetricText, { color: colors.textSecondary }]}>
                  Gastado:{' '}
                  <Text style={[styles.budgetMetricHighlight, { color: colors.text }]}>
                    {isPrivacyHidden
                      ? '••••'
                      : `${currencySymbol}${formatAmount(budgetSpent)}`}
                  </Text>
                </Text>
              </View>

              <View style={styles.budgetMetricItem}>
                <View style={[styles.statusDotSmall, { backgroundColor: '#34D399' }]} />
                <Text style={[styles.budgetMetricText, { color: colors.textSecondary }]}>
                  Restante:{' '}
                  <Text style={[styles.budgetMetricHighlight, { color: colors.income }]}>
                    {isPrivacyHidden
                      ? '••••'
                      : `${currencySymbol}${formatAmount(budgetRemaining)}`}
                  </Text>
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* Movimientos Recientes */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.recentTitleGroup}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Movimientos Recientes</Text>
                <View style={[styles.countBadge, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                    {filteredTransactions.length}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  if (searchQuery) setSearchQuery('');
                  else router.push('/(tabs)/stats');
                }}
                hitSlop={10}
              >
                <Text style={styles.linkOrange}>
                  {searchQuery ? 'Limpiar búsqueda' : 'Ver todos'}
                </Text>
              </Pressable>
            </View>

            {/* Lista de Movimientos */}
            {filteredTransactions.length > 0 ? (
              <View style={styles.transactionsList}>
                {filteredTransactions.map((tx, idx) => {
                  const { catName, isIncome, iconName, iconBg, iconBorder, iconColor } =
                    getCategoryInfo(tx);
                  const isAiTagged =
                    tx.tags?.includes('IA') ||
                    tx.notes?.toLowerCase().includes('ia') ||
                    tx.description.toLowerCase().includes('ia');
                  const isRecurringTx =
                    tx.notes?.toLowerCase().includes('recurrente') ||
                    tx.tags?.includes('#recurrente');

                  return (
                    <AnimatedTransaction
                      key={tx.id}
                      index={idx}
                      onPress={() => setSelectedTx(tx)}
                      style={[styles.transactionItemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                    >
                      <View style={styles.txLeftGroup}>
                        <View
                          style={[
                            styles.txIconContainer,
                            { backgroundColor: iconBg, borderColor: iconBorder },
                          ]}
                        >
                          <Ionicons name={iconName} size={20} color={iconColor} />
                        </View>
                        <View style={styles.txTextCol}>
                          <View style={styles.txTitleRow}>
                            <Text style={[styles.txTitle, { color: colors.text }]} numberOfLines={1}>
                              {tx.merchant || tx.description}
                            </Text>
                            {isAiTagged && (
                              <View style={styles.aiBadge}>
                                <Text style={styles.aiBadgeText}>IA</Text>
                              </View>
                            )}
                            {isRecurringTx && (
                              <View style={styles.fijoBadge}>
                                <Text style={styles.fijoBadgeText}>Fijo</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.txSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {tx.date} • {catName}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.txRightCol}>
                        <Text
                          style={[
                            styles.txAmount,
                            { color: isIncome ? colors.income : colors.text },
                          ]}
                        >
                          {isPrivacyHidden
                            ? '••••'
                            : `${isIncome ? '+' : '-'}${currencySymbol}${formatAmount(
                                tx.amount
                              )}`}
                        </Text>
                        <Text style={[styles.txCurrencyLabel, { color: colors.textMuted }]}>{tx.currency || currency}</Text>
                      </View>
                    </AnimatedTransaction>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {searchQuery
                    ? 'No se encontraron movimientos'
                    : 'Aún no tienes movimientos registrados'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery
                    ? 'Prueba con otra palabra clave en el buscador.'
                    : 'Registra tu primera transacción para ver estadísticas en tiempo real.'}
                </Text>
                <Pressable
                  onPress={() => openNewTxModal()}
                  style={styles.emptyBtn}
                >
                  <Ionicons name="add" size={16} color="#FF6B00" />
                  <Text style={styles.emptyBtnText}>Registrar Movimiento</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Micro-banner de AI Aura Copilot */}
          <View style={[styles.copilotBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.copilotGlow} pointerEvents="none" />
            <View style={styles.copilotLeftGroup}>
              <LinearGradient
                colors={['#FF5500', '#FF8A00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.copilotIconCircle}
              >
                <Ionicons name="hardware-chip" size={16} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.copilotText, { color: colors.text }]} numberOfLines={2}>
                {transactions.length === 0 ? (
                  'Asistente IA listo para optimizar tus finanzas y tus presupuestos.'
                ) : (
                  <>
                    Detectamos oportunidades de ahorro y control para tus finanzas activas.
                  </>
                )}
              </Text>
            </View>
            <Pressable
              onPress={() => setAiModalVisible(true)}
              style={({ pressed }) => [
                styles.copilotBtn,
                { backgroundColor: colors.primarySoft },
                pressed && { opacity: 0.8 },
              ]}
              hitSlop={8}
            >
              <Text style={[styles.copilotBtnText, { color: colors.primary }]}>Explorar</Text>
            </Pressable>
          </View>

          {/* Espaciador inferior para no tapar contenido con el TabBar */}
          <View style={{ height: 110 }} />
        </View>
      </Animated.ScrollView>

      {/* ======================================================== */}
      {/* 1. HERO SUPERIOR EN DEGRADADO NARANJA RADIANTE (STICKY)  */}
      {/* ======================================================== */}
      <Animated.View
        style={[
          styles.stickyHeaderContainer,
          {
            transform: [{ translateY: headerTranslateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <LinearGradient
          colors={['#FF5500', '#FF6800', '#FF6800', '#E65100']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          onLayout={handleHeroLayout}
          style={[styles.heroCard, { paddingTop: Math.max(insets.top + 8, 48) }]}
        >
          {/* Luces difusas de ambiente */}
          <View style={styles.ambientGlowTopRight} pointerEvents="none" />
          <View style={styles.ambientGlowBottomLeft} pointerEvents="none" />

          {/* Contenido superior que se desvanece suavemente al colapsar */}
          <Animated.View
            style={{ opacity: topContentOpacity }}
            pointerEvents={isCollapsed ? 'none' : 'auto'}
          >
            {/* Top row: Avatar, Saludo, Privacidad, Notificaciones */}
            <View style={styles.topRow}>
              <Pressable
                onPress={handleUserPress}
                style={({ pressed }) => [
                  styles.userInfoRow,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
                accessibilityLabel={isGuestMode ? 'Iniciar sesión' : 'Ver perfil y ajustes'}
              >
                <View style={styles.avatarBorder}>
                  {!isGuestMode && user?.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.avatarImage}
                      contentFit="cover"
                    />
                  ) : !isGuestMode ? (
                    <View style={styles.initialsAvatarBox}>
                      <Text style={styles.initialsAvatarText}>
                        {getInitials(displayName)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.guestAvatarBox}>
                      <Ionicons name="person" size={23} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <View style={styles.userTextCol}>
                  <Text style={styles.greetingText}>{greeting}</Text>
                  <View style={styles.nameRow}>
                    <Text style={styles.userNameText}>{displayName}</Text>
                    <Text style={styles.handWave}> 👋</Text>
                  </View>
                  {isGuestMode && (
                    <View style={styles.guestBadgeSmall}>
                      <Ionicons name="log-in-outline" size={11} color="#FDE047" />
                      <Text style={styles.guestBadgeSmallText}>Toca para acceder</Text>
                    </View>
                  )}
                </View>
              </Pressable>

              {/* Acciones superiores: Privacidad y Notificaciones */}
              <View style={styles.topActionButtons}>
                <PressableScale
                  onPress={togglePrivacyHidden}
                  style={styles.glassIconButton}
                  hitSlop={8}
                  hapticType="selection"
                  accessibilityLabel="Alternar privacidad"
                >
                  <Ionicons
                    name={isPrivacyHidden ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                </PressableScale>

                <PressableScale
                  onPress={() => {
                    if (nearDueRecurring.length > 0) {
                      setNearDueModalVisible(true);
                    } else {
                      setRecurringModalVisible(true);
                    }
                  }}
                  style={styles.glassIconButton}
                  hitSlop={8}
                  hapticType="light"
                  accessibilityLabel="Notificaciones de programadas"
                >
                  <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
                  {nearDueRecurring.length > 0 && (
                    <View style={styles.notificationDot} />
                  )}
                </PressableScale>
              </View>
            </View>

            {/* Hero Central: Balance Total Disponible */}
            <View style={styles.balanceContainer}>
              {/* Animación fluida de dinero (Ingreso / Gasto) */}
              {activeMoneyEffect && (
                <MoneyArrivalBadge
                  key={activeMoneyEffect.id}
                  type={activeMoneyEffect.type}
                  amount={activeMoneyEffect.amount}
                  currencySymbol={currencySymbol}
                  onDismiss={() => setActiveMoneyEffect(null)}
                />
              )}

              <Text style={styles.balanceLabel}>BALANCE TOTAL DISPONIBLE</Text>
              <AnimatedNumber
                value={availableBalance}
                currencyPrefix={currencySymbol}
                isPrivacyHidden={isPrivacyHidden}
                formatter={formatAmount}
                style={styles.balanceAmount}
              />

              {/* Píldora Dorada/Ámbar de Último Gasto */}
              {lastExpense && (
                <View style={styles.lastExpensePill}>
                  <Ionicons name="receipt-outline" size={14} color="#0F172A" />
                  <Text style={styles.lastExpenseText} numberOfLines={1}>
                    Último gasto:{' '}
                    <Text style={styles.lastExpenseBold}>
                      {isPrivacyHidden
                        ? '•••'
                        : `-${currencySymbol}${formatAmount(lastExpense.amount)}`}
                    </Text>{' '}
                    en {lastExpense.merchant || lastExpense.description} (Hoy)
                  </Text>
                </View>
              )}

              {/* Subtexto: Límite mensual */}
              <Text style={styles.limitSubtext}>
                Límite mensual controlado • {daysRemaining} días restantes
              </Text>
            </View>

            {/* 4 Botones Circulares de Acción */}
            <View style={styles.actionButtonsRow}>
              {/* 1. Reportes (Botón amarillo suave resaltado) */}
              <PressableScale
                onPress={() => router.push('/(tabs)/stats')}
                style={styles.actionItem}
                hapticType="medium"
              >
                <View style={styles.solidYellowCircle}>
                  <Ionicons name="swap-horizontal" size={25} color="#0F172A" />
                </View>
                <Text style={styles.actionLabel}>Reportes</Text>
              </PressableScale>

              {/* 2. Añadir IA (Botón traslúcido) */}
              <PressableScale
                onPress={() => setAiModalVisible(true)}
                style={styles.actionItem}
                hapticType="medium"
              >
                <View style={styles.glassCircle}>
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>Añadir IA</Text>
              </PressableScale>

              {/* 3. Programadas (Botón traslúcido) */}
              <PressableScale
                onPress={() => setRecurringModalVisible(true)}
                style={styles.actionItem}
                hapticType="medium"
              >
                <View style={styles.glassCircle}>
                  <Ionicons name="sync" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>Programadas</Text>
              </PressableScale>

              {/* 4. Planes (Botón traslúcido) */}
              <PressableScale
                onPress={() => router.push('/(tabs)/accounts')}
                style={styles.actionItem}
                hapticType="medium"
              >
                <View style={styles.glassCircle}>
                  <Ionicons name="wallet-outline" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.actionLabel}>Planes</Text>
              </PressableScale>
            </View>
          </Animated.View>

          {/* Barra de Búsqueda y Moneda integrada en el Hero - permanece visible */}
          <View style={styles.searchBarWrapper}>
            {/* Barra compacta: Balance Mini + Ingresos y Gastos totales (aparece al colapsar) */}
            <Animated.View
              style={[
                styles.miniStatsRow,
                {
                  opacity: miniStatsOpacity,
                  transform: [{ translateY: miniStatsTranslateY }],
                },
              ]}
              pointerEvents={isCollapsed ? 'auto' : 'none'}
            >
              {/* Izquierda: Balance disponible en pequeño */}
              {/* Izquierda: Balance disponible en pequeño con scroll al tocar */}
              <PressableScale
                onPress={scrollToTop}
                onLongPress={togglePrivacyHidden}
                style={[styles.miniBalanceLeft, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}
                hitSlop={6}
                hapticType="light"
                accessibilityLabel="Balance disponible. Toca para ver pantalla naranja completa"
              >
                <Ionicons name="wallet-outline" size={13} color="#FDE047" />
                <Text style={styles.miniBalanceLabel}>Disp.</Text>
                <AnimatedNumber
                  value={availableBalance}
                  currencyPrefix={currencySymbol}
                  isPrivacyHidden={isPrivacyHidden}
                  formatter={(val: number) => `${currencySymbol}${formatCompactNumber(val)}`}
                  style={[styles.miniBalanceAmount, { color: colors.text }]}
                />
              </PressableScale>

              {/* Derecha: Ingresos y Gastos del mes en formato K */}
              <View style={styles.miniStatsRight}>
                <View style={[styles.miniStatBadgeIncome, { backgroundColor: colors.cardElevated, borderColor: colors.income }]}>
                  <Ionicons name="arrow-up" size={12} color="#34D399" />
                  <Text style={styles.miniStatIncomeText}>
                    {isPrivacyHidden ? '•••' : `${formatCompactNumber(monthlyIncome)}`}
                  </Text>
                </View>

                <View style={[styles.miniStatBadgeExpense, { backgroundColor: colors.cardElevated, borderColor: colors.expense }]}>
                  <Ionicons name="arrow-down" size={12} color="#F87171" />
                  <Text style={styles.miniStatExpenseText}>
                    {isPrivacyHidden ? '•••' : `${formatCompactNumber(monthlyExpense)}`}
                  </Text>
                </View>
              </View>
            </Animated.View>

            <ModernSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar movimientos, categorías..."
              currencyLabel={currencyLabel}
              onCurrencyPress={toggleCurrency}
              onClear={() => setSearchQuery('')}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ======================================================== */}
      {/* 3. MODALES DE FUNCIONALIDAD COMPLETA                     */}
      {/* ======================================================== */}
      <TransactionDetailModal
        transaction={selectedTx}
        category={categories.find((c) => c.id === selectedTx?.categoryId)}
        visible={!!selectedTx}
        onClose={() => setSelectedTx(null)}
      />

      <AIAssistantModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
      />

      <BudgetsModal
        visible={budgetsModalVisible}
        onClose={() => setBudgetsModalVisible(false)}
      />

      <GoalsModal
        visible={goalsModalVisible}
        onClose={() => setGoalsModalVisible(false)}
      />

      <DebtsModal
        visible={debtsModalVisible}
        onClose={() => setDebtsModalVisible(false)}
      />

      <RecurringModal
        visible={recurringModalVisible}
        onClose={() => setRecurringModalVisible(false)}
      />

      <NearDueRecurringModal
        visible={nearDueModalVisible}
        onClose={() => setNearDueModalVisible(false)}
        onOpenAllRecurring={() => {
          setNearDueModalVisible(false);
          setRecurringModalVisible(true);
        }}
      />

      <CategoryManagerModal
        visible={categoryManagerVisible}
        onClose={() => setCategoryManagerVisible(false)}
      />

      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        canDismiss={true}
      />

      <InfoExplainerModal
        visible={!!explainerType}
        type={explainerType || 'safe_to_spend'}
        availableBalance={availableBalance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        onClose={() => setExplainerType(null)}
      />
    </TabScreenTransition>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0F15',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  stickyHeaderContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 10,
  },

  /* Hero Section */
  heroCard: {
    width: '100%',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 20,
    paddingBottom: 22,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#FF6800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  ambientGlowTopRight: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  ambientGlowBottomLeft: {
    position: 'absolute',
    left: -30,
    bottom: 20,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(251, 192, 45, 0.2)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    marginBottom: 16,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  guestAvatarBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsAvatarBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  guestBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  guestBadgeSmallText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FDE047',
    letterSpacing: 0.2,
  },
  userTextCol: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  handWave: {
    fontSize: 15,
  },
  topActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glassIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
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
    backgroundColor: '#FDE047',
    borderWidth: 1.5,
    borderColor: '#FF6B00',
  },

  /* Central Balance */
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: 4,
    gap: 6,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.82)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },
  lastExpensePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FBC02D',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '92%',
  },
  lastExpenseText: {
    fontSize: 11.5,
    color: '#0F172A',
    fontWeight: '500',
  },
  lastExpenseBold: {
    fontWeight: '800',
    color: '#0F172A',
  },
  limitSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.78)',
    fontWeight: '500',
    marginTop: 3,
  },

  /* 4 Action Buttons */
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: 18,
    marginBottom: 16,
  },
  actionItem: {
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  solidYellowCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FBC02D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  glassCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  /* Search Bar integrated in Hero Card */
  searchBarWrapper: {
    width: '100%',
    marginTop: 20,
    position: 'relative',
  },
  miniStatsRow: {
    position: 'absolute',
    top: -30,
    left: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  miniBalanceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  miniBalanceLabel: {
    color: '#FDE047',
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniBalanceAmount: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  miniStatsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStatBadgeIncome: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderColor: '#10B981',
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  miniStatIncomeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  miniStatBadgeExpense: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderColor: '#EF4444',
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  miniStatExpenseText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  searchBarContainer: {
    backgroundColor: 'rgba(26, 29, 38, 0.92)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  searchBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  currencyBadgeBtn: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 2,
  },
  currencyBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FDE047',
  },

  /* Body Content */
  bodyContent: {
    paddingHorizontal: 18,
    marginTop: 20,
    gap: 20,
  },

  /* Scheduled Banner */
  scheduledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1530',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  scheduledBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  scheduledCalendarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scheduledRedDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  scheduledBannerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  revisarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  revisarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C084FC',
  },
  bannerCloseBtn: {
    padding: 6,
    marginLeft: 6,
  },

  /* Section Headers */
  sectionBlock: {
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#F8FAFC',
    letterSpacing: -0.2,
  },
  linkOrange: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FB923C',
  },

  /* Opciones de Gasto Grid */
  expenseOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#181B24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B3142',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  optionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#E2E8F0',
  },

  /* Presupuesto Card */
  budgetCard: {
    backgroundColor: '#181B24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B3142',
    padding: 16,
    gap: 12,
  },
  budgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  budgetDonutIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  budgetLimitSubtext: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  budgetPercentCol: {
    alignItems: 'flex-end',
  },
  budgetPercentText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FB923C',
  },
  budgetGastadoBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#11141C',
    borderWidth: 1,
    borderColor: 'rgba(43, 49, 66, 0.6)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressPrimarySegment: {
    height: '100%',
    backgroundColor: '#EA580C',
    borderRadius: 4,
  },
  progressSecondarySegment: {
    height: '100%',
    backgroundColor: '#FBBF24',
  },
  budgetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  budgetMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  budgetMetricText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  budgetMetricHighlight: {
    color: '#F8FAFC',
    fontWeight: '700',
  },

  /* Movimientos Recientes */
  recentTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#1F2330',
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  transactionsList: {
    gap: 10,
  },
  transactionItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181B24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B3142',
    padding: 13,
  },
  txLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  txIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  txTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 107, 0, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.35)',
  },
  aiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FB923C',
  },
  fijoBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: '#1F2330',
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  fijoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  txSubtitle: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  txRightCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  txCurrencyLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },

  /* Empty state */
  emptyCard: {
    backgroundColor: '#181B24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2B3142',
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 4,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  emptyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF6B00',
  },

  /* AI Aura Copilot Micro-banner */
  copilotBanner: {
    backgroundColor: '#181B24',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.3)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  copilotGlow: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
  },
  copilotLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  copilotIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  copilotText: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 16,
  },
  copilotHighlight: {
    color: '#FB923C',
    fontWeight: '700',
  },
  copilotBtn: {
    paddingLeft: 6,
  },
  copilotBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FB923C',
  },
});
