import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { Budget, SavingsGoal, Transaction, CURRENCIES } from '@/types';
import { formatCurrency, formatCurrencySigned } from '@/utils/formatters';

export type PlanItem =
  | { type: 'budget'; data: Budget }
  | { type: 'goal'; data: SavingsGoal };

interface DetallePlanModalProps {
  plan: PlanItem | null;
  visible: boolean;
  onClose: () => void;
}

export const DetallePlanModal: React.FC<DetallePlanModalProps> = ({
  plan,
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const currencySymbol = CURRENCIES[currency]?.symbol || 'RD$';
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const deleteBudget = useFinanceStore((state) => state.deleteBudget);
  const deleteGoal = useFinanceStore((state) => state.deleteGoal);
  const updateBudget = useFinanceStore((state) => state.updateBudget);
  const updateGoal = useFinanceStore((state) => state.updateGoal);
  const contributeToGoal = useFinanceStore((state) => state.contributeToGoal);

  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Contribute state (for goals)
  const [isContributing, setIsContributing] = useState(false);
  const [contributeAmountStr, setContributeAmountStr] = useState('');

  if (!plan) return null;

  // Calculate days in month and days remaining
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemaining = Math.max(1, daysInMonth - currentDay);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  const currentMonthName = monthNames[month];

  // Derive plan properties
  let title = '';
  let subtitleType = '';
  let iconName = 'wallet-outline';
  let iconColor = '#10B981';
  let totalTarget = 0;
  let currentSpentOrSaved = 0;
  let matchingTransactions: Transaction[] = [];

  if (plan.type === 'budget') {
    const budget = plan.data;
    const cat = categories.find((c) => c.id === budget.categoryId);
    title = budget.name || cat?.name || 'Límite de Gasto';
    subtitleType = 'Límite de Gasto';
    iconName = (cat?.icon as any) || 'basket-outline';
    iconColor = cat?.color || '#10B981';
    totalTarget = budget.amount;

    // Filter transactions for this category/budget
    matchingTransactions = transactions.filter((tx) => {
      if (tx.type !== 'expense') return false;
      return (
        tx.budgetId === budget.id ||
        tx.categoryId === budget.categoryId ||
        tx.categoryId === budget.id ||
        (cat && tx.categoryId === cat.id) ||
        (budget.name && tx.description && tx.description.toLowerCase().includes(budget.name.toLowerCase())) ||
        (budget.name && tx.subcategory && tx.subcategory.toLowerCase().includes(budget.name.toLowerCase()))
      );
    });
    const spentFromTxs = matchingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    currentSpentOrSaved = Math.max(budget.spent || 0, spentFromTxs);
  } else {
    const goal = plan.data;
    title = goal.title;
    subtitleType = 'Meta de Ahorro';
    iconName = (goal.icon as any) || 'disc-outline';
    iconColor = goal.color || '#14B8A6';
    totalTarget = goal.targetAmount;

    // Goal matching transactions
    matchingTransactions = transactions.filter((tx) => {
      const isDirectMatch = tx.goalId === goal.id || tx.categoryId === goal.id || tx.categoryId === goal.categoryId;
      const isTitleInDesc = tx.description && tx.description.toLowerCase().includes(goal.title.toLowerCase());
      const isTitleInSub = tx.subcategory && tx.subcategory.toLowerCase() === goal.title.toLowerCase();
      if (tx.categoryId === 'savings_goal' || tx.categoryId === 'savings') {
        if (isTitleInSub || isTitleInDesc) return true;
        const allGoals = useFinanceStore.getState().goals;
        if (allGoals.length === 1 || goal.id === 'goal_savings_main' || goal.title.toLowerCase().includes('meta de ahorro')) return true;
      }
      return isDirectMatch || isTitleInDesc || isTitleInSub;
    });
    const savedFromTxs = matchingTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    currentSpentOrSaved = Math.max(goal.currentAmount || 0, savedFromTxs);
  }

  // Calculate percentages
  const percentage =
    totalTarget > 0
      ? Math.min(100, Math.round((currentSpentOrSaved / totalTarget) * 100))
      : 0;

  // Daily pace
  const actualDaily = currentDay > 0 ? currentSpentOrSaved / currentDay : 0;
  const targetDaily = daysInMonth > 0 ? totalTarget / daysInMonth : 0;

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Plan',
      `¿Estás seguro de que deseas eliminar este plan "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            if (plan.type === 'budget') {
              deleteBudget(plan.data.id);
            } else {
              deleteGoal(plan.data.id);
            }
            onClose();
          },
        },
      ]
    );
  };

  const handleOpenEdit = () => {
    setEditAmountStr(totalTarget.toString());
    setEditTitle(title);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const amt = parseFloat(editAmountStr.replace(/,/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Monto inválido', 'Introduce un monto válido mayor a 0.');
      return;
    }

    if (plan.type === 'budget') {
      updateBudget(plan.data.id, {
        amount: amt,
        name: editTitle.trim() || title,
      });
    } else {
      updateGoal(plan.data.id, {
        targetAmount: amt,
        title: editTitle.trim() || title,
      });
    }

    setIsEditing(false);
  };

  const handleExecuteContribute = () => {
    const amt = parseFloat(contributeAmountStr.replace(/,/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      Alert.alert('Monto inválido', 'Introduce un monto a aportar mayor a 0.');
      return;
    }
    if (plan.type === 'goal') {
      contributeToGoal(plan.data.id, amt);
      setContributeAmountStr('');
      setIsContributing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 48 : 20),
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Detalle del Plan
          </Text>

          <View style={styles.headerActions}>
            <Pressable
              onPress={handleOpenEdit}
              hitSlop={8}
              style={styles.actionIconBtn}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>

            <Pressable
              onPress={handleDelete}
              hitSlop={8}
              style={styles.actionIconBtn}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Centered Category Icon Box */}
            <View
              style={[
                styles.categoryIconBigBox,
                { backgroundColor: `${iconColor}22` },
              ]}
            >
              <Ionicons name={iconName as any} size={30} color={iconColor} />
            </View>

            {/* Title & Subtitles */}
            <Text style={[styles.planTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Text
              style={[
                styles.planSubtitle,
                { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#6B7280' },
              ]}
            >
              {subtitleType}
            </Text>
            <Text
              style={[
                styles.planDateSubtitle,
                { color: isDark ? 'rgba(255, 255, 255, 0.4)' : '#9CA3AF' },
              ]}
            >
              {currentMonthName} de {year} · {daysRemaining} días restantes
            </Text>

            {/* Progress Stats Row */}
            <View style={styles.statsRow}>
              <Text
                style={[
                  styles.percentageBig,
                  { color: isDark ? '#FFFFFF' : '#111827' },
                ]}
              >
                {percentage}%
              </Text>

              <View style={styles.amountCol}>
                <Text
                  style={[
                    styles.amountLabel,
                    {
                      color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#6B7280',
                    },
                  ]}
                >
                  {plan.type === 'budget' ? 'TOTAL GASTADO' : 'TOTAL AHORRADO'}
                </Text>
                <Text
                  style={[
                    styles.amountValue,
                    { color: colors.text },
                  ]}
                >
                  {formatCurrency(currentSpentOrSaved, currency, isPrivacyHidden)}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View
              style={[
                styles.progressBarBg,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.1)'
                    : '#E5E7EB',
                },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, percentage)}%`,
                    backgroundColor:
                      percentage > 100
                        ? colors.expense
                        : percentage > 85
                        ? colors.warning
                        : plan.type === 'budget'
                        ? colors.primary
                        : '#34E4C5',
                  },
                ]}
              />
            </View>

            {/* Objective Amount */}
            <View style={styles.objectiveRow}>
              <Text
                style={[
                  styles.objectiveText,
                  {
                    color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#4B5563',
                  },
                ]}
              >
                Objetivo {formatCurrency(totalTarget, currency, isPrivacyHidden)}
              </Text>
            </View>
          </View>

          {/* Daily Pace Card */}
          <View
            style={[
              styles.dailyCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.dailyIconBox,
                { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
              ]}
            >
              <Ionicons
                name="trending-down-outline"
                size={22}
                color="#10B981"
              />
            </View>

            <View style={styles.dailyTextCol}>
              <Text
                style={[
                  styles.dailyMainRate,
                  { color: colors.text },
                ]}
              >
                {formatCurrency(actualDaily, currency, isPrivacyHidden)} / día
              </Text>
              <Text
                style={[
                  styles.dailySubRate,
                  {
                    color: colors.textMuted,
                  },
                ]}
              >
                Meta: {formatCurrency(targetDaily, currency, isPrivacyHidden)} / día
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textMuted}
            />
          </View>

          {/* Action button for Goals: Aportar a la meta */}
          {plan.type === 'goal' && (
            <Pressable
              style={({ pressed }) => [
                styles.contributeButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => setIsContributing(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.contributeButtonText}>Aportar a la meta</Text>
            </Pressable>
          )}

          {/* Section: Movimientos (N) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Movimientos ({matchingTransactions.length})
            </Text>
          </View>

          {matchingTransactions.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={34}
                color={colors.textMuted}
              />
              <Text
                style={[
                  styles.emptyText,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                Sin movimientos registrados para este plan en este período.
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.transactionsListCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {matchingTransactions.map((tx, idx) => {
                const dateParts = tx.date.split('-');
                const dayNum = dateParts[2] || '';
                const monthIdx = parseInt(dateParts[1] || '1', 10) - 1;
                const shortMonth = [
                  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
                  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
                ][monthIdx] || 'sep';

                return (
                  <React.Fragment key={tx.id}>
                    <View style={styles.transactionRow}>
                      <View
                        style={[
                          styles.txIconBox,
                          { backgroundColor: `${iconColor}20` },
                        ]}
                      >
                        <Ionicons
                          name={iconName as any}
                          size={18}
                          color={iconColor}
                        />
                      </View>

                      <View style={styles.txInfoCol}>
                        <Text
                          style={[styles.txTitle, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {tx.description || tx.merchant || title}
                        </Text>
                        <Text
                          style={[
                            styles.txDate,
                            {
                              color: isDark
                                ? 'rgba(255, 255, 255, 0.45)'
                                : '#78716C',
                            },
                          ]}
                        >
                          {dayNum} de {shortMonth}.
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.txAmount,
                          {
                            color:
                              plan.type === 'goal'
                                ? '#10B981'
                                : tx.type === 'expense'
                                ? colors.text
                                : '#10B981',
                          },
                        ]}
                      >
                        {plan.type === 'goal'
                          ? `+${formatCurrency(tx.amount, currency, isPrivacyHidden)}`
                          : formatCurrencySigned(
                              tx.amount,
                              tx.type,
                              currency,
                              isPrivacyHidden
                            )}
                      </Text>
                    </View>

                    {idx < matchingTransactions.length - 1 && (
                      <View
                        style={[
                          styles.txDivider,
                          {
                            backgroundColor: isDark
                              ? 'rgba(255, 255, 255, 0.05)'
                              : '#F0ECE4',
                          },
                        ]}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal Editar Plan */}
        <Modal
          visible={isEditing}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditing(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.editModalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: colors.text }]}>
                Editar Plan
              </Text>

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Nombre
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: isDark ? colors.backgroundSubtle : '#F3EFEA',
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Monto Objetivo ({currencySymbol})
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: isDark ? colors.backgroundSubtle : '#F3EFEA',
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                keyboardType="numeric"
                value={editAmountStr}
                onChangeText={setEditAmountStr}
              />

              <View style={styles.editButtonsRow}>
                <Pressable
                  style={[
                    styles.editCancelBtn,
                    {
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setIsEditing(false)}
                >
                  <Text
                    style={[styles.editCancelText, { color: colors.textSecondary }]}
                  >
                    Cancelar
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.editSaveText}>Guardar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Aportar a Meta */}
        <Modal
          visible={isContributing}
          transparent
          animationType="fade"
          onRequestClose={() => setIsContributing(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.editModalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: colors.text }]}>
                Aportar a {title}
              </Text>

              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Monto del aporte ({currencySymbol})
              </Text>
              <TextInput
                style={[
                  styles.editInput,
                  {
                    backgroundColor: isDark ? colors.backgroundSubtle : '#F3EFEA',
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={contributeAmountStr}
                onChangeText={setContributeAmountStr}
                autoFocus
              />

              <View style={styles.editButtonsRow}>
                <Pressable
                  style={[
                    styles.editCancelBtn,
                    {
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setIsContributing(false)}
                >
                  <Text
                    style={[styles.editCancelText, { color: colors.textSecondary }]}
                  >
                    Cancelar
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.editSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleExecuteContribute}
                >
                  <Text style={styles.editSaveText}>Aportar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    minHeight: 52,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryIconBigBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 3,
  },
  planDateSubtitle: {
    fontSize: 12,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  percentageBig: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  progressBarBg: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  objectiveRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  objectiveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 16,
  },
  dailyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyTextCol: {
    flex: 1,
  },
  dailyMainRate: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dailySubRate: {
    fontSize: 12.5,
  },
  contributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#14B8A6',
    height: 48,
    borderRadius: 16,
    marginBottom: 16,
  },
  contributeButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  transactionsListCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfoCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  txDivider: {
    height: 1,
    marginLeft: 66,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  editModalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  editInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  editCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  editSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSaveText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
