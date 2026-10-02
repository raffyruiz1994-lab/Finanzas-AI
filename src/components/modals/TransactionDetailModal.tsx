import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, Category } from '@/types';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { formatCurrencySigned } from '@/utils/formatters';
import { ThemeColors } from '@/constants/theme';
import { PressableScale } from '@/components/animated/PressableScale';
import { MotionView } from '@/components/animated/MotionView';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  category?: Category;
  visible: boolean;
  onClose: () => void;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  category,
  visible,
  onClose,
}) => {
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const accounts = useFinanceStore((state) => state.accounts);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  if (!transaction) return null;

  const account = accounts.find((a) => a.id === transaction.accountId);
  const destAccount = accounts.find((a) => a.id === transaction.destinationAccountId);

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    useUIStore.getState().showToast({
      type: 'info',
      title: 'Movimiento eliminado',
      message: `${transaction.description} (${formatCurrencySigned(transaction.amount, transaction.type, currency, isPrivacyHidden)})`,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Tocar fuera cierra el modal */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <MotionView
          preset="scale"
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Header */}
          <View style={styles.topRow}>
            <View style={[styles.catIcon, { backgroundColor: `${category?.color || colors.primary}20` }]}>
              <Ionicons
                name={(category?.icon as any) || 'receipt-outline'}
                size={22}
                color={category?.color || colors.primary}
              />
            </View>
            <PressableScale onPress={onClose} hapticFeedback="selection" hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </PressableScale>
          </View>

          {/* Amount */}
          <Text
            style={[
              styles.amountText,
              {
                color:
                  transaction.type === 'income'
                    ? colors.income
                    : transaction.type === 'transfer'
                    ? colors.transfer
                    : colors.text,
              },
            ]}
          >
            {formatCurrencySigned(transaction.amount, transaction.type, currency, isPrivacyHidden)}
          </Text>

          <Text style={[styles.titleText, { color: colors.text }]}>
            {transaction.description}
          </Text>

          {/* Info Details List */}
          <View style={[styles.detailsBox, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Tipo</Text>
              <Text style={[styles.detailVal, { color: colors.text }]}>
                {transaction.type === 'expense' ? 'Gasto' : transaction.type === 'income' ? 'Ingreso' : 'Transferencia'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Categoría</Text>
              <Text style={[styles.detailVal, { color: colors.text }]}>
                {category?.name || 'General'}
              </Text>
            </View>

            {transaction.subcategory && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Subcategoría</Text>
                <Text style={[styles.detailVal, { color: colors.text }]}>
                  {transaction.subcategory}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Fecha</Text>
              <Text style={[styles.detailVal, { color: colors.text }]}>
                {transaction.date} {transaction.time ? `· ${transaction.time}` : ''}
              </Text>
            </View>

            {transaction.merchant && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textSecondary }]}>Comercio</Text>
                <Text style={[styles.detailVal, { color: colors.text }]}>
                  {transaction.merchant}
                </Text>
              </View>
            )}
          </View>

          {/* Action Delete */}
          <PressableScale
            onPress={handleDelete}
            hapticFeedback="warning"
            style={[styles.deleteButton, { backgroundColor: 'rgba(244, 63, 94, 0.12)' }]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.expense} />
            <Text style={[styles.deleteButtonText, { color: colors.expense }]}>
              Eliminar Movimiento
            </Text>
          </PressableScale>
        </MotionView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailsBox: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailKey: {
    fontSize: 12.5,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

