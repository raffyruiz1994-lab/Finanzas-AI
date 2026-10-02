import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

interface DebtsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DebtsModal: React.FC<DebtsModalProps> = ({ visible, onClose }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const debts = useFinanceStore((state) => state.debts);
  const payDebt = useFinanceStore((state) => state.payDebt);

  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const handlePay = (debtId: string) => {
    const amt = parseFloat(payAmount.replace(/,/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      alert('Introduce un monto válido');
      return;
    }
    payDebt(debtId, amt);
    setPayingDebtId(null);
    setPayAmount('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="document-text-outline" size={20} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Deudas y Préstamos</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Control de cuotas y amortización de capital
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {debts.map((d) => {
              const paidPercent = Math.round(((d.totalAmount - d.remainingAmount) / d.totalAmount) * 100);

              return (
                <View
                  key={d.id}
                  style={[
                    styles.debtCard,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.debtTopRow}>
                    <View>
                      <Text style={[styles.debtTitle, { color: colors.text }]}>{d.title}</Text>
                      <Text style={[styles.debtCreditor, { color: colors.textSecondary }]}>
                        {d.creditor} · {d.dueDate}
                      </Text>
                    </View>

                    <View style={styles.cuotaBadge}>
                      <Text style={[styles.cuotaLabel, { color: colors.textSecondary }]}>Cuota:</Text>
                      <Text style={[styles.cuotaVal, { color: colors.expense }]}>
                        {formatCurrency(d.monthlyPayment, currency, isPrivacyHidden)}
                      </Text>
                    </View>
                  </View>

                  {/* Amounts */}
                  <View style={styles.amountsRow}>
                    <View>
                      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Saldo Pendiente</Text>
                      <Text style={[styles.metaAmount, { color: colors.expense }]}>
                        {formatCurrency(d.remainingAmount, currency, isPrivacyHidden)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Monto Original</Text>
                      <Text style={[styles.metaAmount, { color: colors.text }]}>
                        {formatCurrency(d.totalAmount, currency, isPrivacyHidden)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${paidPercent}%`, backgroundColor: '#10B981' },
                      ]}
                    />
                  </View>
                  <Text style={[styles.percentLabel, { color: colors.textMuted }]}>{paidPercent}% pagado</Text>

                  {/* Pay action */}
                  {payingDebtId === d.id ? (
                    <View style={styles.payInputRow}>
                      <TextInput
                        style={[styles.payField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        placeholder="Monto de abono..."
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={payAmount}
                        onChangeText={setPayAmount}
                        autoFocus
                      />
                      <Pressable
                        onPress={() => handlePay(d.id)}
                        style={[styles.confirmBtn, { backgroundColor: colors.expense }]}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      </Pressable>
                      <Pressable
                        onPress={() => setPayingDebtId(null)}
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                      >
                        <Ionicons name="close" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setPayingDebtId(d.id)}
                      style={[styles.payActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: colors.expense }]}
                    >
                      <Ionicons name="card-outline" size={16} color={colors.expense} />
                      <Text style={[styles.payActionText, { color: colors.expense }]}>Registrar Abono a Cuota</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
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
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    height: '75%',
    padding: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
  },
  list: {
    flex: 1,
  },
  debtCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  debtTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  debtTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  debtCreditor: {
    fontSize: 11,
    marginTop: 2,
  },
  cuotaBadge: {
    alignItems: 'flex-end',
  },
  cuotaLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  cuotaVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 10,
    textAlign: 'right',
  },
  payActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  payActionText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  payInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payField: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
