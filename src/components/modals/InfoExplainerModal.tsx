import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { SafeToSpendBreakdown } from '@/types';

interface InfoExplainerModalProps {
  visible: boolean;
  type: 'available_balance' | 'safe_to_spend';
  safeData?: SafeToSpendBreakdown;
  availableBalance?: number;
  totalIncome?: number;
  totalExpense?: number;
  onClose: () => void;
}

export const InfoExplainerModal: React.FC<InfoExplainerModalProps> = ({
  visible,
  type,
  safeData,
  availableBalance = 0,
  totalIncome = 0,
  totalExpense = 0,
  onClose,
}) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currencyCode = useSettingsStore((state) => state.currency);

  const isSafe = type === 'safe_to_spend';

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
                  name={isSafe ? 'shield-checkmark' : 'wallet'}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>
                {isSafe ? '¿Cómo se calcula el Seguro?' : '¿Qué es el Balance Disponible?'}
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {isSafe ? (
              <View style={styles.body}>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                  El <Text style={{ color: colors.primary, fontWeight: '700' }}>Seguro para Gastar</Text> es la métrica más inteligente de la aplicación. Te indica con exactitud cuánto dinero puedes gastar libremente sin poner en riesgo tus compromisos del mes:
                </Text>

                {safeData && (
                  <View style={[styles.calcBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.calcTitle, { color: colors.textMuted }]}>FÓRMULA MATEMÁTICA EN TIEMPO REAL:</Text>

                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { color: colors.text }]}>Fondos Líquidos Actuales</Text>
                      <Text style={[styles.calcVal, { color: colors.income }]}>
                        +{formatCurrency(safeData.availableCash, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { color: colors.expense }]}>(-) Facturas y Recurrentes por pagar</Text>
                      <Text style={[styles.calcVal, { color: colors.expense }]}>
                        -{formatCurrency(safeData.upcomingBills, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.calcRow}>
                      <Text style={[styles.calcLabel, { color: colors.warning }]}>(-) Aportes reservados a Metas</Text>
                      <Text style={[styles.calcVal, { color: colors.warning }]}>
                        -{formatCurrency(safeData.allocatedSavings, currencyCode)}
                      </Text>
                    </View>

                    <View style={[styles.calcDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.calcRow}>
                      <Text style={[styles.calcTotalLabel, { color: colors.primary }]}>= Seguro para Gastar Total</Text>
                      <Text style={[styles.calcTotalVal, { color: colors.primary }]}>
                        {formatCurrency(safeData.safeToSpendTotal, currencyCode)}
                      </Text>
                    </View>

                    <View style={styles.dailyBadge}>
                      <Ionicons name="sparkles" size={14} color="#0D0C0A" />
                      <Text style={styles.dailyBadgeText}>
                        Límite sugerido: {formatCurrency(safeData.dailySafeAmount, currencyCode)} al día por los próximos {safeData.daysRemainingInPeriod} días.
                      </Text>
                    </View>
                  </View>
                )}

                <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                  💡 <Text style={{ fontWeight: '700', color: colors.text }}>Consejo Financiero:</Text> Mientras tu gasto diario se mantenga por debajo de este límite, nunca tendrás que recurrir a endeudarte para cubrir tus facturas esenciales a fin de mes.
                </Text>
              </View>
            ) : (
              <View style={styles.body}>
                <Text style={[styles.desc, { color: colors.textSecondary }]}>
                  El <Text style={{ color: colors.primary, fontWeight: '700' }}>Balance Disponible</Text> representa el dinero real e inmediato que tienes a tu disposición:
                </Text>

                <View style={[styles.infoList, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <View style={styles.infoRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.income} />
                    <Text style={[styles.infoRowText, { color: colors.text }]}>
                      Suma el saldo de tus cuentas corrientes, de cheques y efectivo en mano.
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="alert-circle" size={16} color={colors.warning} />
                    <Text style={[styles.infoRowText, { color: colors.text }]}>
                      NO incluye el crédito disponible de tarjetas de crédito para evitar una falsa sensación de liquidez.
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="shield-outline" size={16} color={colors.primary} />
                    <Text style={[styles.infoRowText, { color: colors.text }]}>
                      Tus ahorros a largo plazo se mantienen protegidos como respaldo patrimonial.
                    </Text>
                  </View>
                </View>

                <View style={[styles.calcBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Ingresos acumulados del período:</Text>
                    <Text style={[styles.calcVal, { color: colors.income }]}>
                      +{formatCurrency(totalIncome, currencyCode)}
                    </Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={[styles.calcLabel, { color: colors.textSecondary }]}>Gastos realizados en el período:</Text>
                    <Text style={[styles.calcVal, { color: colors.expense }]}>
                      -{formatCurrency(totalExpense, currencyCode)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <Pressable
              onPress={onClose}
              style={[styles.understandBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.understandBtnText}>Entendido</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 24,
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
    marginRight: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
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
  body: {
    gap: 14,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
  },
  calcBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  calcTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 13,
  },
  calcVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  calcDivider: {
    height: 1,
    marginVertical: 4,
  },
  calcTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  calcTotalVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  dailyBadge: {
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dailyBadgeText: {
    color: '#0D0C0A',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  tipText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  infoList: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  infoRowText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  understandBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 18,
  },
  understandBtnText: {
    color: '#0D0C0A',
    fontWeight: '800',
    fontSize: 15,
  },
});
