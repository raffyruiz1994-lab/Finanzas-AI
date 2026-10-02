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
import { CURRENCIES } from '@/types';

interface NuevaMetaModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NuevaMetaModal: React.FC<NuevaMetaModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const currencySymbol = CURRENCIES[currency]?.symbol || 'RD$';

  const addGoal = useFinanceStore((state) => state.addGoal);

  // Form states
  const [amountStr, setAmountStr] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('disc-outline');
  const [periodType, setPeriodType] = useState('monthly');
  const [isRecurring, setIsRecurring] = useState(true);

  // Submodals
  const [pickerVisible, setPickerVisible] = useState(false);
  const [customTitleInput, setCustomTitleInput] = useState('');

  const numericAmount = parseFloat(amountStr.replace(/,/g, '')) || 0;

  // Date range
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthNames = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  const dateRangeStr = `1 de ${monthNames[month]}. de ${year} - ${lastDay} de ${monthNames[month]}. de ${year}`;

  const PRESET_GOALS = [
    { title: 'Meta de Ahorro', icon: 'wallet-outline', color: '#10B981' },
    { title: 'Servicios', icon: 'flash-outline', color: '#3B82F6' },
    { title: 'Fondo de Emergencia', icon: 'shield-checkmark-outline', color: '#14B8A6' },
    { title: 'Vacaciones & Viajes', icon: 'airplane-outline', color: '#F59E0B' },
    { title: 'Comprar Vehículo', icon: 'car-sport-outline', color: '#6366F1' },
    { title: 'Educación & Cursos', icon: 'school-outline', color: '#EC4899' },
    { title: 'Tecnología / Laptop', icon: 'laptop-outline', color: '#8B5CF6' },
  ];

  const handleSave = () => {
    if (numericAmount <= 0) {
      Alert.alert('Monto requerido', 'Por favor introduce una meta mayor a 0.');
      return;
    }
    const finalTitle = goalTitle.trim() || 'Meta de Ahorro';

    addGoal({
      title: finalTitle,
      targetAmount: numericAmount,
      currentAmount: 0,
      currency,
      deadlineDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
      icon: selectedIcon,
      color: '#14B8A6',
      progressPercentage: 0,
      isRecurring,
      period: periodType,
    });

    setAmountStr('');
    setGoalTitle('');
    onClose();
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
              Nueva Meta
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
                Meta a alcanzar
              </Text>

              <View style={styles.amountRow}>
                <Text style={styles.currencyPrefixCyan}>{currencySymbol}</Text>

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
              {/* Row 1: Categoría / Nombre */}
              <Pressable
                style={styles.optionRow}
                onPress={() => setPickerVisible(true)}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(20, 184, 166, 0.16)' },
                  ]}
                >
                  <Ionicons
                    name={(selectedIcon as any) || 'disc-outline'}
                    size={22}
                    color="#14B8A6"
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
                        color: goalTitle ? colors.text : colors.textSecondary,
                        fontWeight: goalTitle ? '700' : '500',
                      },
                    ]}
                  >
                    {goalTitle || 'Seleccionar categoría'}
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
              <View style={styles.optionRow}>
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
                    Mes
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
              </View>

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
                    numericAmount > 0
                      ? colors.primary
                      : isDark
                      ? colors.cardElevated
                      : '#E5E0D8',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={numericAmount <= 0}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  {
                    color:
                      numericAmount > 0
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

        {/* Modal Selección / Creación de Meta */}
        <Modal
          visible={pickerVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPickerVisible(false)}
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
                  Objetivo de Ahorro
                </Text>
                <Pressable onPress={() => setPickerVisible(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
              >
                {PRESET_GOALS.map((preset) => {
                  const isSelected = goalTitle === preset.title;
                  return (
                    <Pressable
                      key={preset.title}
                      style={[
                        styles.catOptionItem,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(20, 184, 166, 0.16)'
                              : '#E6FFFA'
                            : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setGoalTitle(preset.title);
                        setSelectedIcon(preset.icon);
                        setPickerVisible(false);
                      }}
                    >
                      <View
                        style={[
                          styles.catIconSquare,
                          { backgroundColor: `${preset.color}20` },
                        ]}
                      >
                        <Ionicons
                          name={preset.icon as any}
                          size={20}
                          color={preset.color}
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
                        {preset.title}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#14B8A6"
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Entrada personalizada */}
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
                  placeholder="Otro nombre de meta..."
                  placeholderTextColor={colors.textMuted}
                  value={customTitleInput}
                  onChangeText={setCustomTitleInput}
                />
                <Pressable
                  style={[styles.addCatBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    if (customTitleInput.trim()) {
                      setGoalTitle(customTitleInput.trim());
                      setSelectedIcon('disc-outline');
                      setCustomTitleInput('');
                      setPickerVisible(false);
                    }
                  }}
                >
                  <Ionicons name="checkmark" size={18} color="#FFF" />
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
  currencyPrefixCyan: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#34E4C5',
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
  inlineCreateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
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
