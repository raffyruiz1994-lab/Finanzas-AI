import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { Account, CURRENCIES } from '@/types';
import { formatCurrency, formatCurrencySigned } from '@/utils/formatters';

interface AccountDetailModalProps {
  account: Account | null;
  visible: boolean;
  onClose: () => void;
}

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  account,
  visible,
  onClose,
}) => {
  if (!account) return null;

  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currencyCode = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const payCreditCard = useFinanceStore((state) => state.payCreditCard);
  const updateAccount = useFinanceStore((state) => state.updateAccount);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);

  const isCredit = account.type === 'credit_card';
  const limit = account.creditLimit || 100000;
  const used = account.balanceUsed || 0;
  const available = Math.max(0, limit - used);

  // Pay credit card sub-modal state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFromAccountId, setPayFromAccountId] = useState(
    accounts.find((a) => a.type !== 'credit_card')?.id || ''
  );
  const [payAmount, setPayAmount] = useState(used.toString());

  // Adjust balance sub-modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustedBalance, setAdjustedBalance] = useState(
    (isCredit ? used : account.balance).toString()
  );

  // Transactions for this account
  const accountTransactions = transactions.filter(
    (t) => t.accountId === account.id || t.destinationAccountId === account.id
  );

  const handleExecutePayment = () => {
    const amt = parseFloat(payAmount.replace(/,/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      alert('Ingresa un monto válido para pagar la tarjeta.');
      return;
    }
    if (!payFromAccountId) {
      alert('Selecciona la cuenta de origen con fondos para pagar.');
      return;
    }

    payCreditCard(account.id, payFromAccountId, amt);
    setShowPayModal(false);
    alert(`¡Pago de ${formatCurrency(amt, currencyCode)} aplicado exitosamente!`);
  };

  const handleExecuteAdjust = () => {
    const amt = parseFloat(adjustedBalance.replace(/,/g, ''));
    if (isNaN(amt)) {
      alert('Ingresa un monto numérico válido.');
      return;
    }

    if (isCredit) {
      updateAccount(account.id, { balanceUsed: amt, balance: -amt });
    } else {
      updateAccount(account.id, { balance: amt });
    }
    setShowAdjustModal(false);
  };

  const handleDelete = () => {
    if (accounts.length <= 1) {
      alert('No puedes eliminar la única cuenta disponible.');
      return;
    }
    deleteAccount(account.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Top Handle */}
          <View style={styles.topHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.accIconBox, { backgroundColor: `${account.color}20` }]}>
                <Ionicons name={account.icon as any} size={20} color={account.color} />
              </View>
              <View>
                <Text style={[styles.accTitle, { color: colors.text }]}>{account.name}</Text>
                <Text style={[styles.accSub, { color: colors.textSecondary }]}>
                  {account.bankName || (isCredit ? 'Tarjeta de Crédito' : 'Cuenta de Fondos')}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Credit Card Visual Hero or Regular Account Hero */}
            {isCredit ? (
              <View style={[styles.creditHero, { backgroundColor: '#181B24', borderColor: 'rgba(255, 104, 0, 0.4)' }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardBrandGroup}>
                    <Ionicons name="card" size={22} color="#FF6800" />
                    <View>
                      <Text style={styles.cardNameText}>{account.name}</Text>
                      <Text style={styles.bankNameText}>{account.bankName || 'Banco'}</Text>
                    </View>
                  </View>
                  <View style={styles.visaBadge}>
                    <Text style={styles.visaText}>VISA</Text>
                  </View>
                </View>

                {/* Grid stats */}
                <View style={styles.gridStats}>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Límite</Text>
                    <Text style={styles.gridVal}>
                      {formatCurrency(limit, currencyCode, isPrivacyHidden)}
                    </Text>
                  </View>

                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Consumido</Text>
                    <Text style={[styles.gridVal, { color: '#F87171' }]}>
                      {formatCurrency(used, currencyCode, isPrivacyHidden)}
                    </Text>
                  </View>

                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Disponible</Text>
                    <Text style={[styles.gridVal, { color: '#34D399' }]}>
                      {formatCurrency(available, currencyCode, isPrivacyHidden)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.utilBarBg}>
                  <View
                    style={[
                      styles.utilBarFill,
                      {
                        width: `${Math.min(100, Math.round((used / limit) * 100))}%`,
                        backgroundColor: used / limit > 0.8 ? '#EF4444' : '#FF6800',
                      },
                    ]}
                  />
                </View>

                {/* Cut-off and Payment due */}
                <View style={styles.cardDatesRow}>
                  <View style={styles.dateChip}>
                    <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.dateChipText}>Corte: Día {account.billingClosingDay || 15}</Text>
                  </View>
                  <View style={styles.dateChip}>
                    <Ionicons name="alert-circle-outline" size={12} color="#FBBF24" />
                    <Text style={[styles.dateChipText, { color: '#FBBF24' }]}>
                      Pago: Día {account.paymentDueDay || 28}
                    </Text>
                  </View>
                </View>

                {/* Pay Card Button */}
                <Pressable
                  onPress={() => {
                    setPayAmount(used.toString());
                    setShowPayModal(true);
                  }}
                  style={styles.payCardBtn}
                >
                  <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.payCardBtnText}>Pagar Tarjeta de Crédito</Text>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.liquidHero, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                <Text style={[styles.liquidLabel, { color: colors.textSecondary }]}>Balance Actual</Text>
                <Text style={[styles.liquidAmount, { color: colors.primary }]}>
                  {formatCurrency(account.balance, currencyCode, isPrivacyHidden)}
                </Text>

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => setShowAdjustModal(true)}
                    style={[styles.smallActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Ionicons name="pencil-outline" size={14} color={colors.text} />
                    <Text style={[styles.smallActionText, { color: colors.text }]}>Ajustar Balance</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Account Movement History */}
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Movimientos ({accountTransactions.length})
              </Text>
            </View>

            {accountTransactions.length > 0 ? (
              <View style={[styles.txListContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {accountTransactions.map((tx, idx) => (
                  <View key={tx.id} style={styles.txRow}>
                    <View style={styles.txLeft}>
                      <View
                        style={[
                          styles.txIconBox,
                          {
                            backgroundColor:
                              tx.type === 'income'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : tx.type === 'expense'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(59, 130, 246, 0.15)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            tx.type === 'income'
                              ? 'arrow-down'
                              : tx.type === 'expense'
                              ? 'arrow-up'
                              : 'swap-horizontal'
                          }
                          size={14}
                          color={
                            tx.type === 'income'
                              ? colors.income
                              : tx.type === 'expense'
                              ? colors.expense
                              : colors.transfer
                          }
                        />
                      </View>
                      <View>
                        <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                        <Text style={[styles.txDate, { color: colors.textSecondary }]}>{tx.date}</Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        {
                          color:
                            tx.type === 'income'
                              ? colors.income
                              : tx.type === 'expense'
                              ? colors.expense
                              : colors.transfer,
                        },
                      ]}
                    >
                      {formatCurrencySigned(tx.amount, tx.type, currencyCode, isPrivacyHidden)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No hay movimientos registrados para esta cuenta.
                </Text>
              </View>
            )}

            {/* Delete Account button */}
            <Pressable
              onPress={handleDelete}
              style={[styles.deleteBtn, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteBtnText}>Eliminar Cuenta</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* Pay Credit Card Sub-Modal */}
      <Modal visible={showPayModal} transparent animationType="fade" onRequestClose={() => setShowPayModal(false)}>
        <View style={styles.subModalOverlay}>
          <View style={[styles.subModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subModalHeader}>
              <Text style={[styles.subModalTitle, { color: colors.text }]}>Pagar Tarjeta</Text>
              <Pressable onPress={() => setShowPayModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.subModalDesc, { color: colors.textSecondary }]}>
              Selecciona desde qué cuenta bancaria debitar los fondos para reducir la deuda de tu tarjeta:
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cuenta Origen</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {accounts
                .filter((a) => a.id !== account.id && a.type !== 'credit_card')
                .map((a) => (
                  <Pressable
                    key={a.id}
                    onPress={() => setPayFromAccountId(a.id)}
                    style={[
                      styles.sourcePill,
                      {
                        backgroundColor: payFromAccountId === a.id ? colors.primaryGlow : colors.backgroundSubtle,
                        borderColor: payFromAccountId === a.id ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: payFromAccountId === a.id ? colors.primary : colors.text, fontWeight: '600' }}>
                      {a.name} ({formatCurrency(a.balance, currencyCode)})
                    </Text>
                  </Pressable>
                ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Monto a Pagar</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />

            <Pressable
              onPress={handleExecutePayment}
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Confirmar Pago</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Adjust Balance Sub-Modal */}
      <Modal visible={showAdjustModal} transparent animationType="fade" onRequestClose={() => setShowAdjustModal(false)}>
        <View style={styles.subModalOverlay}>
          <View style={[styles.subModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.subModalHeader}>
              <Text style={[styles.subModalTitle, { color: colors.text }]}>Ajustar Balance</Text>
              <Pressable onPress={() => setShowAdjustModal(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.subModalDesc, { color: colors.textSecondary }]}>
              Establece el balance real directamente si no coincide con tu extracto bancario:
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nuevo Balance</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
              value={adjustedBalance}
              onChangeText={setAdjustedBalance}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
            />

            <Pressable
              onPress={handleExecuteAdjust}
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.confirmBtnText}>Actualizar Balance</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '88%',
    borderWidth: 1,
  },
  topHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  accSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  scroll: {
    flexGrow: 0,
  },
  creditHero: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardNameText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  bankNameText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  visaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visaText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  gridStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCol: {},
  gridLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginBottom: 2,
  },
  gridVal: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  utilBarBg: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  utilBarFill: {
    height: 6,
    borderRadius: 3,
  },
  cardDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  payCardBtn: {
    backgroundColor: '#FF6800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  payCardBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  liquidHero: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  liquidLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  liquidAmount: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionRow: {
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
  },
  txListContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '600',
  },
  txDate: {
    fontSize: 11,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  subModalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  subModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subModalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  subModalDesc: {
    fontSize: 13,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  sourcePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
