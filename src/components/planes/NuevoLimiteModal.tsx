import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  Switch,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { Category, CURRENCIES } from '@/types';

interface NuevoLimiteModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NuevoLimiteModal: React.FC<NuevoLimiteModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const currencySymbol = CURRENCIES[currency]?.symbol || 'RD$';

  const categories = useFinanceStore((state) => state.categories);
  const categoryGroups = useFinanceStore((state) => state.categoryGroups);
  const addBudget = useFinanceStore((state) => state.addBudget);
  const addCategory = useFinanceStore((state) => state.addCategory);

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');

  // Form states
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [periodType, setPeriodType] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [isRecurring, setIsRecurring] = useState(true);

  // Submodals
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [periodPickerVisible, setPeriodPickerVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Format amount input for visual clarity
  const numericAmount = parseFloat(amountStr.replace(/,/g, '')) || 0;

  // Compute date range for subtitle
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  const dateRangeStr = `1 de ${monthNames[month]}. de ${year} - ${lastDay} de ${monthNames[month]}. de ${year}`;

  const handleSave = () => {
    if (numericAmount <= 0) {
      Alert.alert('Monto requerido', 'Por favor introduce un límite mayor a 0.');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Categoría requerida', 'Por favor selecciona la categoría para este límite.');
      return;
    }

    addBudget({
      categoryId: selectedCategory.id,
      name: selectedCategory.name,
      amount: numericAmount,
      period: periodType,
      alertThreshold: 0.85,
      isRecurring,
      startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    });

    // Reset and close
    setAmountStr('');
    setSelectedCategory(null);
    onClose();
  };

  const handleCreateNewCategory = () => {
    if (!newCatName.trim()) return;
    const defaultGroup = categoryGroups?.find((g) => g.type === 'expense');
    const created = addCategory({
      name: newCatName.trim(),
      icon: 'basket-outline',
      color: '#F59E0B',
      type: 'expense',
      groupId: defaultGroup?.id,
      subcategories: ['General'],
    });
    setSelectedCategory(created);
    setNewCatName('');
    setShowCreateCategory(false);
    setCategoryPickerVisible(false);
  };

  const handleKeyPress = (val: string) => {
    if (val === 'backspace') {
      setAmountStr((prev) => prev.slice(0, -1));
    } else if (val === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr((prev) => (prev ? `${prev}.` : '0.'));
      }
    } else {
      if (amountStr.length >= 10) return;
      if (amountStr === '0') {
        setAmountStr(val);
      } else {
        setAmountStr((prev) => `${prev}${val}`);
      }
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Nuevo Límite
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Amount Display */}
            <View style={styles.heroAmountSection}>
              <Text
                style={[
                  styles.heroLabel,
                  { color: colors.textSecondary },
                ]}
              >
                Límite máximo
              </Text>

              <View style={styles.amountRow}>
                <Text
                  style={[
                    styles.currencyPrefix,
                    { color: colors.text },
                  ]}
                >
                  {currencySymbol}
                </Text>

                <TextInput
                  style={[
                    styles.amountInput,
                    { color: colors.text },
                  ]}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={amountStr}
                  onChangeText={(val) => {
                    const clean = val.replace(/[^0-9.]/g, '');
                    setAmountStr(clean);
                  }}
                  autoFocus={true}
                />
              </View>
            </View>

            {/* Options Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Row 1: Categoría */}
              <Pressable
                style={styles.optionRow}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: selectedCategory
                        ? `${selectedCategory.color}25`
                        : 'rgba(239, 68, 68, 0.16)',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      (selectedCategory?.icon as any) || 'shield-outline'
                    }
                    size={22}
                    color={selectedCategory?.color || '#EF4444'}
                  />
                </View>

                <View style={styles.optionTextCol}>
                  <Text
                    style={[
                      styles.rowSubLabel,
                      { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#6B7280' },
                    ]}
                  >
                    Categoría
                  </Text>
                  <Text
                    style={[
                      styles.rowMainText,
                      {
                        color: selectedCategory
                          ? colors.text
                          : colors.textSecondary,
                        fontWeight: selectedCategory ? '700' : '500',
                      },
                    ]}
                  >
                    {selectedCategory
                      ? selectedCategory.name
                      : 'Seleccionar categoría'}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? 'rgba(255, 255, 255, 0.35)' : '#9CA3AF'}
                />
              </Pressable>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#F0ECE4',
                  },
                ]}
              />

              {/* Row 2: Período */}
              <Pressable
                style={styles.optionRow}
                onPress={() => setPeriodPickerVisible(true)}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(59, 130, 246, 0.16)' },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
                </View>

                <View style={styles.optionTextCol}>
                  <Text
                    style={[
                      styles.rowSubLabel,
                      { color: isDark ? 'rgba(255, 255, 255, 0.5)' : '#6B7280' },
                    ]}
                  >
                    Período
                  </Text>
                  <Text style={[styles.rowMainText, { color: colors.text, fontWeight: '700' }]}>
                    {periodType === 'monthly'
                      ? 'Mes'
                      : periodType === 'biweekly'
                      ? 'Quincenal'
                      : 'Semanal'}
                  </Text>
                  <Text
                    style={[
                      styles.rowDateRange,
                      { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#78716C' },
                    ]}
                  >
                    {dateRangeStr}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDark ? 'rgba(255, 255, 255, 0.35)' : '#9CA3AF'}
                />
              </Pressable>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : '#F0ECE4',
                  },
                ]}
              />

              {/* Row 3: Recurrente */}
              <View style={styles.optionRow}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(139, 92, 246, 0.16)' },
                  ]}
                >
                  <Ionicons name="repeat-outline" size={22} color="#8B5CF6" />
                </View>

                <View style={styles.optionTextCol}>
                  <Text style={[styles.rowMainText, { color: colors.text, fontWeight: '700' }]}>
                    Recurrente
                  </Text>
                  <Text
                    style={[
                      styles.rowDateRange,
                      { color: isDark ? 'rgba(255, 255, 255, 0.45)' : '#78716C' },
                    ]}
                  >
                    Renovar automáticamente al finalizar
                  </Text>
                </View>

                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{
                    false: isDark ? colors.cardElevated : '#D1D5DB',
                    true: colors.primary,
                  }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </ScrollView>

          {/* Bottom Save Action */}
          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor:
                    numericAmount > 0 && selectedCategory
                      ? colors.primary
                      : isDark
                      ? colors.cardElevated
                      : '#E5E0D8',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={numericAmount <= 0 || !selectedCategory}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  {
                    color:
                      numericAmount > 0 && selectedCategory
                        ? '#FFFFFF'
                        : colors.textMuted,
                  },
                ]}
              >
                Guardar
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* Modal Selección de Categoría */}
        <Modal
          visible={categoryPickerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setCategoryPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.categoryModalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.catModalHeader}>
                <Text style={[styles.catModalTitle, { color: colors.text }]}>
                  Seleccionar categoría
                </Text>
                <Pressable onPress={() => setCategoryPickerVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {expenseCategories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.catOptionItem,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(16, 185, 129, 0.16)'
                              : '#E6F4EA'
                            : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setSelectedCategory(cat);
                        setCategoryPickerVisible(false);
                      }}
                    >
                      <View
                        style={[
                          styles.catIconSquare,
                          { backgroundColor: `${cat.color}20` },
                        ]}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={20}
                          color={cat.color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.catOptionName,
                          {
                            color: colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#10B981"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Botón Crear Categoría */}
              {showCreateCategory ? (
                <View style={styles.inlineCreateBox}>
                  <TextInput
                    style={[
                      styles.newCatInput,
                      {
                        backgroundColor: isDark ? '#1C253B' : '#F3EFEA',
                        color: colors.text,
                        borderColor: isDark
                          ? 'rgba(255, 255, 255, 0.15)'
                          : '#D1D5DB',
                      },
                    ]}
                    placeholder="Nombre de categoría..."
                    placeholderTextColor={colors.textMuted}
                    value={newCatName}
                    onChangeText={setNewCatName}
                    autoFocus
                  />
                  <Pressable
                    style={[styles.addCatBtn, { backgroundColor: colors.primary }]}
                    onPress={handleCreateNewCategory}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={styles.newCatAction}
                  onPress={() => setShowCreateCategory(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={[styles.newCatActionText, { color: colors.primary }]}>
                    Crear nueva categoría
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </Modal>

        {/* Modal Selección de Período */}
        <Modal
          visible={periodPickerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPeriodPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.categoryModalCard,
                {
                  backgroundColor: isDark ? '#141B2D' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2DDD4',
                },
              ]}
            >
              <View style={styles.catModalHeader}>
                <Text style={[styles.catModalTitle, { color: colors.text }]}>
                  Frecuencia del límite
                </Text>
                <Pressable onPress={() => setPeriodPickerVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              {[
                { id: 'monthly', title: 'Mensual (Mes completo)' },
                { id: 'biweekly', title: 'Quincenal (15 días)' },
                { id: 'weekly', title: 'Semanal (7 días)' },
              ].map((p) => {
                const isSelected = periodType === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.catOptionItem,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? 'rgba(59, 130, 246, 0.16)'
                            : '#EFF6FF'
                          : 'transparent',
                      },
                    ]}
                    onPress={() => {
                      setPeriodType(p.id as any);
                      setPeriodPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.catOptionName,
                        {
                          color: colors.text,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {p.title}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color="#3B82F6"
                      />
                    )}
                  </Pressable>
                );
              })}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heroAmountSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
    minWidth: 90,
    textAlign: 'left',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  rowSubLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  rowMainText: {
    fontSize: 15,
  },
  rowDateRange: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 74,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    borderTopWidth: 1,
  },
  saveButton: {
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  categoryModalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  catModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  catModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  catOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 12,
    marginBottom: 4,
  },
  catIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catOptionName: {
    fontSize: 14.5,
    flex: 1,
  },
  newCatAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  newCatActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inlineCreateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
  },
  newCatInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addCatBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
