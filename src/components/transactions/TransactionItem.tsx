import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, Category } from '@/types';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrencySigned } from '@/utils/formatters';
import { ThemeColors } from '@/constants/theme';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  category,
  onPress,
  onLongPress,
}) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  // Determinar icono y color de categoría
  const iconName = (category?.icon as any) || (transaction.type === 'income' ? 'cash-outline' : 'cart-outline');
  const catColor = category?.color || (transaction.type === 'income' ? '#10B981' : '#F59E0B');

  // Subtítulo: Subcategoría o nombre de categoría
  const subtitle = transaction.subcategory || category?.name || 'Movimiento';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: pressed ? colors.backgroundSubtle : 'transparent' },
      ]}
    >
      {/* Category Icon */}
      <View style={[styles.iconWrapper, { backgroundColor: `${catColor}20` }]}>
        <Ionicons name={iconName} size={20} color={catColor} />
      </View>

      {/* Main Info */}
      <View style={styles.infoCol}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <View style={styles.subRow}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle}
          </Text>
          {transaction.isRecurring && (
            <View style={styles.recurringBadge}>
              <Text style={styles.recurringBadgeText}>Programada</Text>
            </View>
          )}
          {transaction.tags && transaction.tags.length > 0 && (
            <View style={styles.tagBadge}>
              <Text style={styles.tagText}>{transaction.tags[0]}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Amount with sign */}
      <View style={styles.amountCol}>
        <Text
          style={[
            styles.amount,
            {
              color:
                transaction.type === 'income'
                  ? colors.income
                  : transaction.type === 'transfer'
                  ? colors.transfer
                  : colors.text,
            },
          ]}
          numberOfLines={1}
        >
          {formatCurrencySigned(transaction.amount, transaction.type, currency, isPrivacyHidden)}
        </Text>
        {transaction.time && (
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {transaction.time}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subtitle: {
    fontSize: 12.5,
  },
  tagBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  tagText: {
    color: '#60A5FA',
    fontSize: 10.5,
    fontWeight: '600',
  },
  recurringBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  recurringBadgeText: {
    color: '#C084FC',
    fontSize: 10.5,
    fontWeight: '700',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  timeText: {
    fontSize: 11,
    marginTop: 2,
  },
});

