import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Transaction, Category } from '@/types';
import { TransactionItem } from './TransactionItem';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrencySigned } from '@/utils/formatters';
import { ThemeColors } from '@/constants/theme';

interface TransactionDayGroupProps {
  displayDate: string;
  totalDay: number;
  transactions: Transaction[];
  categories: Category[];
  onSelectTransaction?: (tx: Transaction) => void;
}

export const TransactionDayGroup: React.FC<TransactionDayGroupProps> = ({
  displayDate,
  totalDay,
  transactions,
  categories,
  onSelectTransaction,
}) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);

  return (
    <View style={styles.groupContainer}>
      {/* Date Header Row */}
      <View style={styles.headerRow}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {displayDate}
        </Text>
        <Text
          style={[
            styles.totalDayText,
            { color: totalDay >= 0 ? colors.income : colors.expense },
          ]}
        >
          {formatCurrencySigned(
            totalDay,
            totalDay >= 0 ? 'income' : 'expense',
            currency,
            isPrivacyHidden
          )}
        </Text>
      </View>

      {/* Card containing items */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {transactions.map((tx, idx) => (
          <React.Fragment key={tx.id}>
            <TransactionItem
              transaction={tx}
              category={getCategory(tx.categoryId)}
              onPress={() => onSelectTransaction?.(tx)}
            />
            {idx < transactions.length - 1 && (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  groupContainer: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  totalDayText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    marginLeft: 72,
    marginRight: 16,
  },
});

