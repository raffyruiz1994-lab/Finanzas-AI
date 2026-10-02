import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { RecurringFrequency } from '@/types';

export interface RecurringConfigData {
  frequency: RecurringFrequency;
  interval: number;
  dayOfMonth: number;
  dayOfWeek?: number;
  hasEndDate: boolean;
  endDate?: string;
}

interface RecurringConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (config: RecurringConfigData) => void;
  initialConfig?: Partial<RecurringConfigData>;
  type?: 'expense' | 'income';
}

const FREQUENCY_OPTIONS: { id: RecurringFrequency; label: string }[] = [
  { id: 'daily', label: 'Diario' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'biweekly', label: 'Quincenal' },
  { id: 'monthly', label: 'Mensual' },
  { id: 'yearly', label: 'Anual' },
];

export const RecurringConfigModal: React.FC<RecurringConfigModalProps> = ({
  visible,
  onClose,
  onConfirm,
  initialConfig,
  type = 'expense',
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  // Consistent brand & financial action accent
  const accentColor = type === 'income' ? colors.income : colors.primary;
  const accentSoft =
    type === 'income'
      ? colors.incomeBg
      : isDark
      ? 'rgba(255, 104, 0, 0.14)'
      : 'rgba(255, 104, 0, 0.08)';
  const accentBorder =
    type === 'income'
      ? 'rgba(16, 185, 129, 0.35)'
      : 'rgba(255, 104, 0, 0.35)';

  const [frequency, setFrequency] = useState<RecurringFrequency>(
    initialConfig?.frequency || 'monthly'
  );
  const [interval, setInterval] = useState<number>(initialConfig?.interval || 1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(
    initialConfig?.dayOfMonth || new Date().getDate()
  );
  const [hasEndDate, setHasEndDate] = useState<boolean>(
    initialConfig?.hasEndDate || false
  );

  const getIntervalUnit = () => {
    switch (frequency) {
      case 'daily':
        return interval === 1 ? 'día' : 'días';
      case 'weekly':
        return interval === 1 ? 'semana' : 'semanas';
      case 'biweekly':
        return 'quincena';
      case 'monthly':
        return interval === 1 ? 'mes' : 'meses';
      case 'yearly':
        return interval === 1 ? 'año' : 'años';
      default:
        return 'período';
    }
  };

  const getSummaryText = () => {
    switch (frequency) {
      case 'daily':
        return interval === 1
          ? 'Esta transacción se generará automáticamente todos los días'
          : `Esta transacción se generará automáticamente cada ${interval} días`;
      case 'weekly':
        return interval === 1
          ? 'Esta transacción se generará automáticamente cada semana'
          : `Esta transacción se generará automáticamente cada ${interval} semanas`;
      case 'biweekly':
        return `Esta transacción se generará automáticamente de forma quincenal (día ${dayOfMonth} y día ${(dayOfMonth + 14) % 30 || 30})`;
      case 'monthly':
        return interval === 1
          ? `Esta transacción se generará automáticamente cada mes el día ${dayOfMonth}`
          : `Esta transacción se generará automáticamente cada ${interval} meses el día ${dayOfMonth}`;
      case 'yearly':
        return `Esta transacción se generará automáticamente cada año`;
      default:
        return 'Esta transacción se generará de manera recurrente';
    }
  };

  const handleConfirm = () => {
    onConfirm({
      frequency,
      interval,
      dayOfMonth,
      hasEndDate,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.overlay,
          { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.5)' },
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginBottom: Math.max(insets.bottom, 14) + 10,
            },
          ]}
        >
          {/* Indicador de arrastre superior */}
          <View
            style={[
              styles.dragHandle,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)' },
            ]}
          />

          {/* Cabecera */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Configurar programación
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {type === 'income' ? 'Ingreso programado' : 'Gasto programado'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Sección Frecuencia */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>
              Frecuencia
            </Text>
            <View style={styles.frequencyGrid}>
              {FREQUENCY_OPTIONS.map((opt) => {
                const isSelected = frequency === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setFrequency(opt.id)}
                    style={[
                      styles.frequencyBtn,
                      {
                        backgroundColor: isSelected
                          ? accentColor
                          : isDark
                          ? colors.surfaceSecondary
                          : colors.backgroundSubtle,
                        borderColor: isSelected ? accentColor : colors.border,
                      },
                      opt.id === 'yearly' && styles.frequencyBtnFull,
                    ]}
                  >
                    <Text
                      style={[
                        styles.frequencyBtnText,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Sección Cada cuánto */}
            <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 18 }]}>
              Cada cuánto
            </Text>
            <View
              style={[
                styles.stepperContainer,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Pressable
                onPress={() => setInterval((prev) => Math.max(1, prev - 1))}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: isDark ? '#2B3142' : '#E2E8F0' },
                ]}
                hitSlop={8}
              >
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>

              <Text style={[styles.stepperValueText, { color: colors.text }]}>
                {interval} <Text style={{ fontSize: 15, fontWeight: '500' }}>{getIntervalUnit()}</Text>
              </Text>

              <Pressable
                onPress={() => setInterval((prev) => prev + 1)}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: isDark ? '#2B3142' : '#E2E8F0' },
                ]}
                hitSlop={8}
              >
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* Sección Día del mes (para mensual o quincenal) */}
            {(frequency === 'monthly' || frequency === 'biweekly') && (
              <>
                <Text style={[styles.sectionHeading, { color: colors.textSecondary, marginTop: 18 }]}>
                  Día del mes
                </Text>
                <View
                  style={[
                    styles.stepperContainer,
                    {
                      backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setDayOfMonth((prev) => Math.max(1, prev - 1))}
                    style={[
                      styles.stepperBtn,
                      { backgroundColor: isDark ? '#2B3142' : '#E2E8F0' },
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons name="remove" size={18} color={colors.text} />
                  </Pressable>

                  <Text style={[styles.stepperValueText, { color: colors.text }]}>
                    {dayOfMonth} <Text style={{ fontSize: 15, fontWeight: '500' }}>del mes</Text>
                  </Text>

                  <Pressable
                    onPress={() => setDayOfMonth((prev) => Math.min(31, prev + 1))}
                    style={[
                      styles.stepperBtn,
                      { backgroundColor: isDark ? '#2B3142' : '#E2E8F0' },
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={18} color={colors.text} />
                  </Pressable>
                </View>
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  Si el mes tiene menos días, se usará el último día del mes
                </Text>
              </>
            )}

            {/* Toggle Fecha de fin */}
            <View
              style={[
                styles.toggleRow,
                {
                  backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.toggleLabel, { color: colors.text }]}>Fecha de fin</Text>
              <Switch
                value={hasEndDate}
                onValueChange={setHasEndDate}
                trackColor={{ false: isDark ? '#2B3142' : '#CBD5E1', true: accentColor }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* Resumen dinámico */}
            <View
              style={[
                styles.summaryCard,
                {
                  backgroundColor: accentSoft,
                  borderColor: accentBorder,
                },
              ]}
            >
              <Ionicons name="information-circle-outline" size={18} color={accentColor} />
              <Text
                style={[
                  styles.summaryText,
                  { color: isDark ? colors.text : type === 'income' ? '#047857' : '#C2410C' },
                ]}
              >
                {getSummaryText()}
              </Text>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Botón Confirmar */}
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: accentColor, shadowColor: accentColor },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.confirmBtnText}>Confirmar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetCard: {
    borderRadius: 30,
    marginHorizontal: 16,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 18,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 2,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyBtn: {
    width: '48.5%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  frequencyBtnFull: {
    width: '100%',
  },
  frequencyBtnText: {
    fontSize: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 18,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 18,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  confirmBtn: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
