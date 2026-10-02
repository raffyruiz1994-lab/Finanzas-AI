import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Switch,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { RecurringPayment, Category } from '@/types';
import { CATEGORY_EMOJIS, getCategoryEmoji } from '@/components/modals/NewTransactionModal';

interface NearDueRecurringModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAllRecurring?: () => void;
}

export const NearDueRecurringModal: React.FC<NearDueRecurringModalProps> = ({
  visible,
  onClose,
  onOpenAllRecurring,
}) => {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const recurring = useFinanceStore((state) => state.recurring);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const goals = useFinanceStore((state) => state.goals);
  const budgets = useFinanceStore((state) => state.budgets);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const updateRecurring = useFinanceStore((state) => state.updateRecurring);

  // Today string for tracking applied status
  const todayStr = new Date().toISOString().split('T')[0];

  // Modify Amount sub-sheet state
  const [modifyingItem, setModifyingItem] = useState<RecurringPayment | null>(null);
  const [modifiedAmountStr, setModifiedAmountStr] = useState('');
  const [updateFutureAmount, setUpdateFutureAmount] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Filter only active & near-due recurring transactions that haven't been applied today
  const nearDueList = useMemo(() => {
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

  // Total amount to be applied
  const totalAmountToApply = useMemo(() => {
    return nearDueList.reduce((sum, r) => sum + r.amount, 0);
  }, [nearDueList]);

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Helper to compute next cycle due label
  const calculateNextCycleDueDate = (r: RecurringPayment): string => {
    if (r.frequency === 'daily') return 'Mañana';
    if (r.frequency === 'weekly') return 'En 7 días';
    if (r.frequency === 'biweekly') return 'En 15 días';
    if (r.frequency === 'yearly') return 'En 1 año';
    const day = r.dayOfMonth || 30;
    return `El día ${day} del próximo mes`;
  };

  // Helper to get category
  const getCategory = (catId: string): Category | undefined => {
    return categories.find((c) => c.id === catId);
  };

  // 1. APLICAR TRANSACCIÓN (Directamente con el monto actual)
  const handleApplyTransaction = (item: RecurringPayment, customAmount?: number) => {
    const finalAmount = customAmount !== undefined ? customAmount : item.amount;
    const cat = getCategory(item.categoryId);
    const mainAccountId = item.accountId || accounts[0]?.id || 'acc_cash';

    const matchingGoal = goals.find(
      (g) =>
        g.id === item.categoryId ||
        (item.categoryId === 'savings_goal' &&
          g.title.toLowerCase().includes(item.title.toLowerCase()))
    );

    const matchingBudget = budgets.find(
      (b) =>
        b.id === item.categoryId ||
        b.categoryId === item.categoryId ||
        (b.name && item.title.toLowerCase().includes(b.name.toLowerCase()))
    );

    // Registrar la transacción real
    addTransaction({
      type: item.type || 'expense',
      amount: finalAmount,
      currency: currency,
      categoryId: item.categoryId || 'other_expense',
      accountId: mainAccountId,
      goalId: matchingGoal?.id,
      budgetId: matchingBudget?.id,
      date: todayStr,
      description: item.title,
      merchant: item.title,
      tags: ['#programada', '#recurrente'],
      isRecurring: true,
      notes: `Transacción programada aplicada el ${new Date().toLocaleDateString('es-DO')}`,
    });

    // Actualizar el estado del pago programado (avanza su fecha y marca aplicado hoy)
    const nextDueDate = calculateNextCycleDueDate(item);
    updateRecurring(item.id, {
      lastAppliedDate: todayStr,
      nextDueDate: nextDueDate,
    });

    const isExpense = (item.type || 'expense') === 'expense';
    const prefix = isExpense ? '-' : '+';
    showToast(
      `✓ "${item.title}" aplicada: ${prefix}${formatCurrency(finalAmount, currency, isPrivacyHidden)}`
    );
  };

  // 2. MODIFICAR MONTO Y APLICAR
  const handleOpenModifyModal = (item: RecurringPayment) => {
    setModifyingItem(item);
    setModifiedAmountStr(item.amount.toString());
    setUpdateFutureAmount(false);
  };

  const handleConfirmModifiedApply = () => {
    if (!modifyingItem) return;
    Keyboard.dismiss();

    const num = parseFloat(modifiedAmountStr.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    // Aplicar transacción con el monto modificado
    handleApplyTransaction(modifyingItem, num);

    // Si el usuario marcó actualizar también a futuro:
    if (updateFutureAmount) {
      updateRecurring(modifyingItem.id, {
        amount: num,
      });
    }

    setModifyingItem(null);
  };

  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20);
  const bottomPadding = Math.max(insets.bottom, 20);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: isDark ? '#0D0C0A' : colors.background }]}>
        {/* Toast Notifier */}
        {toastMessage && (
          <View style={[styles.toastContainer, { top: headerPaddingTop + 60 }]}>
            <View style={styles.toastCard}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </View>
        )}

        {/* Cabecera Principal */}
        <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Programadas por Vencer</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {nearDueList.length} {nearDueList.length === 1 ? 'pendiente' : 'pendientes'}
            </Text>
          </View>

          {onOpenAllRecurring ? (
            <Pressable
              onPress={() => {
                onClose();
                onOpenAllRecurring();
              }}
              hitSlop={10}
              style={({ pressed }) => [styles.headerAllBtn, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="list" size={16} color="#F59E0B" />
              <Text style={styles.headerAllBtnText}>Ver todas</Text>
            </Pressable>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 30 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Banner Informativo Superior (Exacto al estilo Morado de Notificación de Programadas) */}
          <View
            style={[
              styles.infoBanner,
              {
                backgroundColor: isDark ? '#1C1530' : 'rgba(147, 51, 234, 0.1)',
                borderColor: isDark ? 'rgba(168, 85, 247, 0.35)' : 'rgba(147, 51, 234, 0.25)',
              },
            ]}
          >
            <View style={styles.infoBannerIconCol}>
              <View style={styles.calendarCircleIcon}>
                <Ionicons name="calendar" size={20} color="#C084FC" />
                <View style={styles.redBadgeDot} />
              </View>
            </View>
            <View style={styles.infoBannerTextCol}>
              <Text style={[styles.infoBannerTitle, { color: isDark ? '#F3E8FF' : '#581C87' }]}>
                Transacciones listas para ejecutar
              </Text>
              <Text style={[styles.infoBannerDesc, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#6B21A8' }]}>
                Aplica el gasto o ingreso para descontarlo de tu saldo, o modifica el monto si este mes varió el valor.
              </Text>

              {nearDueList.length > 0 && (
                <View style={styles.bannerSummaryRow}>
                  <View style={styles.summaryTag}>
                    <Text style={styles.summaryTagLabel}>Total estimado:</Text>
                    <Text style={styles.summaryTagValue}>
                      {formatCurrency(totalAmountToApply, currency, isPrivacyHidden)}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Listado de Transacciones Cercanas a Vencer */}
          {nearDueList.length === 0 ? (
            /* Estado Vacío - Todo al Día */
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: isDark ? '#161310' : colors.card,
                  borderColor: isDark ? '#26221A' : colors.border,
                },
              ]}
            >
              <View style={styles.emptyIconCircle}>
                <Ionicons name="checkmark-done" size={40} color="#10B981" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>¡Todo al día!</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                No tienes transacciones programadas pendientes por vencer en este momento. Todas las cercanas han sido aplicadas.
              </Text>

              {onOpenAllRecurring && (
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenAllRecurring();
                  }}
                  style={styles.emptyActionBtn}
                >
                  <Ionicons name="calendar-outline" size={18} color="#0D0C0A" />
                  <Text style={styles.emptyActionBtnText}>Ver todas las programadas</Text>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.cardsList}>
              {nearDueList.map((item) => {
                const cat = getCategory(item.categoryId);
                const emoji = getCategoryEmoji(item.categoryId);
                const isExpense = (item.type || 'expense') === 'expense';
                const dueText = item.nextDueDate || 'Próxima';
                const isDueToday = dueText.toLowerCase().includes('hoy');

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: isDark ? '#161310' : colors.card,
                        borderColor: isDark ? '#26221A' : colors.border,
                      },
                    ]}
                  >
                    {/* Header de la Tarjeta */}
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.categoryIconCircle,
                          { backgroundColor: cat?.color ? `${cat.color}25` : 'rgba(245, 158, 11, 0.15)' },
                        ]}
                      >
                        <Text style={styles.categoryEmoji}>{emoji}</Text>
                      </View>

                      <View style={styles.cardHeaderInfo}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {item.title}
                          </Text>
                          {/* Badge de vencimiento */}
                          <View
                            style={[
                              styles.dueBadge,
                              isDueToday
                                ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }
                                : { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#A855F7' },
                            ]}
                          >
                            <Ionicons
                              name={isDueToday ? 'flash' : 'time-outline'}
                              size={11}
                              color={isDueToday ? '#EF4444' : '#C084FC'}
                            />
                            <Text
                              style={[
                                styles.dueBadgeText,
                                { color: isDueToday ? '#EF4444' : '#C084FC' },
                              ]}
                            >
                              {isDueToday ? 'Vence hoy' : dueText}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.cardCategory, { color: colors.textSecondary }]}>
                          {cat?.name || 'General'} • {item.frequency === 'daily' ? 'Diario' : item.frequency === 'weekly' ? 'Semanal' : item.frequency === 'biweekly' ? 'Quincenal' : item.frequency === 'yearly' ? 'Anual' : `Día ${item.dayOfMonth || 30}`}
                        </Text>
                      </View>
                    </View>

                    {/* Fila de Monto Destacado */}
                    <View style={styles.cardAmountRow}>
                      <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                        {isExpense ? 'Monto a debitar:' : 'Monto a acreditar:'}
                      </Text>
                      <Text
                        style={[
                          styles.cardAmount,
                          { color: isExpense ? '#EF4444' : '#10B981' },
                        ]}
                      >
                        {isExpense ? '-' : '+'}
                        {formatCurrency(item.amount, currency, isPrivacyHidden)}
                      </Text>
                    </View>

                    {/* Divisor */}
                    <View
                      style={[
                        styles.cardDivider,
                        { backgroundColor: isDark ? '#26221A' : colors.border },
                      ]}
                    />

                    {/* ========================================================= */}
                    {/* LOS DOS BOTONES REQUERIDOS POR EL USUARIO                */}
                    {/* 1. Aplicar transacción                                    */}
                    {/* 2. Modificar monto a aplicar                              */}
                    {/* ========================================================= */}
                    <View style={styles.actionButtonsRow}>
                      {/* Botón 2: Modificar Monto */}
                      <Pressable
                        onPress={() => handleOpenModifyModal(item)}
                        style={({ pressed }) => [
                          styles.modifyBtn,
                          {
                            backgroundColor: isDark ? '#231F1A' : colors.backgroundSubtle,
                            borderColor: isDark ? '#3D3528' : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="create-outline" size={16} color="#F59E0B" />
                        <Text style={styles.modifyBtnText}>Modificar monto</Text>
                      </Pressable>

                      {/* Botón 1: Aplicar Transacción */}
                      <Pressable
                        onPress={() => handleApplyTransaction(item)}
                        style={({ pressed }) => [
                          styles.applyBtn,
                          {
                            backgroundColor: '#10B981',
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                        <Text style={styles.applyBtnText}>Aplicar transacción</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* =================================================================== */}
        {/* SUBMODAL: MODIFICAR MONTO A APLICAR                                 */}
        {/* Permite cambiar el monto si este mes la transacción varió          */}
        {/* =================================================================== */}
        {modifyingItem && (
          <Modal
            visible={!!modifyingItem}
            transparent
            animationType="slide"
            onRequestClose={() => {
              Keyboard.dismiss();
              setModifyingItem(null);
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <View style={styles.modifySheetOverlay}>
                {/* Backdrop: click outside to dismiss keyboard and close */}
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    Keyboard.dismiss();
                    setModifyingItem(null);
                  }}
                />

                <View
                  style={[
                    styles.modifySheetCard,
                    {
                      backgroundColor: isDark ? '#161310' : colors.card,
                      borderColor: isDark ? '#26221A' : colors.border,
                      paddingBottom: bottomPadding + 14,
                    },
                  ]}
                >
                  {/* Drag Handle */}
                  <Pressable
                    onPress={Keyboard.dismiss}
                    style={{ width: '100%', alignItems: 'center', paddingVertical: 4 }}
                  >
                    <View style={styles.dragHandle} />
                  </Pressable>

                  {/* Header */}
                  <View style={styles.modifySheetHeader}>
                    <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
                      <Text style={[styles.modifySheetTitle, { color: colors.text }]}>
                        Modificar monto a aplicar
                      </Text>
                      <Text style={[styles.modifySheetSub, { color: colors.textSecondary }]}>
                        {modifyingItem.title} • {getCategory(modifyingItem.categoryId)?.name || 'General'}
                      </Text>
                    </Pressable>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {keyboardVisible && (
                        <Pressable
                          onPress={() => Keyboard.dismiss()}
                          style={styles.hideKeyboardPill}
                          hitSlop={8}
                        >
                          <Ionicons name="chevron-down" size={14} color="#F59E0B" />
                          <Text style={styles.hideKeyboardPillText}>Ocultar</Text>
                        </Pressable>
                      )}

                      <Pressable
                        onPress={() => {
                          Keyboard.dismiss();
                          setModifyingItem(null);
                        }}
                        hitSlop={10}
                        style={styles.sheetCloseBtn}
                      >
                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  </View>

                  <ScrollView
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 6 }}
                  >
                    {/* Banner de monto original */}
                    <Pressable
                      onPress={Keyboard.dismiss}
                      style={[
                        styles.originalAmountBanner,
                        {
                          backgroundColor: isDark ? '#1C1530' : 'rgba(147, 51, 234, 0.08)',
                          borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(147, 51, 234, 0.2)',
                        },
                      ]}
                    >
                      <Ionicons name="information-circle-outline" size={18} color="#C084FC" />
                      <Text style={[styles.originalAmountText, { color: isDark ? '#E9D5FF' : '#6B21A8' }]}>
                        Monto programado habitual:{' '}
                        <Text style={{ fontWeight: '700' }}>
                          {formatCurrency(modifyingItem.amount, currency, false)}
                        </Text>
                      </Text>
                    </Pressable>

                    {/* Campo de Monto Real */}
                    <View style={styles.inputSection}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        Nuevo monto para esta aplicación:
                      </Text>
                      <View
                        style={[
                          styles.amountInputContainer,
                          {
                            backgroundColor: isDark ? '#0D0C0A' : colors.backgroundSubtle,
                            borderColor: isDark ? '#3D3528' : colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.currencyPrefix}>{currency} $</Text>
                        <TextInput
                          value={modifiedAmountStr}
                          onChangeText={setModifiedAmountStr}
                          keyboardType="numeric"
                          placeholder="0.00"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          selectTextOnFocus
                          style={[styles.amountTextInput, { color: colors.text }]}
                        />
                        {keyboardVisible && (
                          <Pressable
                            onPress={() => Keyboard.dismiss()}
                            hitSlop={8}
                            style={{ padding: 4 }}
                          >
                            <Ionicons name="checkmark-done" size={20} color="#10B981" />
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {/* Toggle: Actualizar también monto fijo a futuro */}
                    <View
                      style={[
                        styles.toggleFutureBox,
                        {
                          backgroundColor: isDark ? '#1C1814' : colors.backgroundSubtle,
                          borderColor: isDark ? '#26221A' : colors.border,
                        },
                      ]}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={[styles.toggleFutureTitle, { color: colors.text }]}>
                          Actualizar también monto fijo futuro
                        </Text>
                        <Text style={[styles.toggleFutureSub, { color: colors.textSecondary }]}>
                          Si se activa, las próximas veces se aplicará con este nuevo monto en vez del anterior.
                        </Text>
                      </View>
                      <Switch
                        value={updateFutureAmount}
                        onValueChange={setUpdateFutureAmount}
                        trackColor={{ false: 'rgba(255, 255, 255, 0.1)', true: '#F59E0B' }}
                        thumbColor={updateFutureAmount ? '#FFFFFF' : '#888888'}
                      />
                    </View>

                    {/* Botón de Confirmación */}
                    <Pressable
                      onPress={handleConfirmModifiedApply}
                      style={({ pressed }) => [
                        styles.confirmApplyBtn,
                        { opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <Text style={styles.confirmApplyBtnText}>
                        Aplicar con este monto
                      </Text>
                    </Pressable>
                  </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  headerAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  headerAllBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoBannerIconCol: {
    marginRight: 14,
    paddingTop: 2,
  },
  calendarCircleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  redBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#1C1530',
  },
  infoBannerTextCol: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoBannerDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  bannerSummaryRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  summaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  summaryTagLabel: {
    fontSize: 11.5,
    color: '#D8B4FE',
  },
  summaryTagValue: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardsList: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardCategory: {
    fontSize: 12.5,
  },
  cardAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
  },
  cardDivider: {
    height: 1,
    marginBottom: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modifyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  modifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
  },
  applyBtn: {
    flex: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyStateCard: {
    borderRadius: 22,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D0C0A',
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modifySheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modifySheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modifySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modifySheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modifySheetSub: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  originalAmountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  originalAmountText: {
    fontSize: 13,
    flex: 1,
  },
  inputSection: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 58,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F59E0B',
    marginRight: 10,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    padding: 0,
  },
  toggleFutureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 22,
  },
  toggleFutureTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  toggleFutureSub: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  confirmApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmApplyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hideKeyboardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  hideKeyboardPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#F59E0B',
  },
});
