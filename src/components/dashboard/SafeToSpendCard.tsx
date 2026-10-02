import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrency } from '@/utils/formatters';
import { SafeToSpendBreakdown } from '@/types';
import { ThemeColors } from '@/constants/theme';

interface SafeToSpendCardProps {
  data: SafeToSpendBreakdown;
  onInfoPress?: () => void;
}

export const SafeToSpendCard: React.FC<SafeToSpendCardProps> = ({ data, onInfoPress }) => {
  const [expanded, setExpanded] = useState(false);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);
  const isSafeSpendVisible = useSettingsStore((state) => state.isSafeSpendVisible);

  if (!isSafeSpendVisible) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#18120B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(249, 115, 22, 0.22)' : 'rgba(249, 115, 22, 0.18)',
          shadowColor: isDark ? '#000' : 'rgba(0, 0, 0, 0.08)',
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.18)' : 'rgba(249, 115, 22, 0.12)' },
            ]}
          >
            <Ionicons name="wallet-outline" size={17} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Seguro para Gastar</Text>
        </View>

        <Pressable onPress={onInfoPress} hitSlop={10}>
          <Ionicons
            name="help-circle-outline"
            size={17}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Primary Amount */}
      <Text style={[styles.amount, { color: colors.primary }]}>
        {formatCurrency(data.safeToSpendTotal, currency, isPrivacyHidden)}
      </Text>

      {/* Subline: Daily rate & days remaining */}
      <View style={styles.sublineRow}>
        <View style={styles.dailyRateGroup}>
          <Ionicons
            name="calculator-outline"
            size={15}
            color={colors.textSecondary}
          />
          <Text style={[styles.dailyRateText, { color: colors.textSecondary }]}>
            {formatCurrency(data.dailySafeAmount, currency, isPrivacyHidden)} / día · {data.daysRemainingInPeriod} días restantes
          </Text>
        </View>

        <Pressable
          onPress={() => setExpanded(!expanded)}
          hitSlop={8}
          style={styles.expandToggle}
        >
          <Text style={[styles.toggleText, { color: colors.primary }]}>
            {expanded ? 'Ver menos' : 'Ver más'}
          </Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.primary}
          />
        </Pressable>
      </View>

      {/* Expanded Breakdown */}
      {expanded && (
        <View
          style={[
            styles.breakdownBox,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.35)' : colors.backgroundSubtle,
              borderColor: isDark ? 'rgba(249, 115, 22, 0.15)' : colors.border,
            },
          ]}
        >
          <Text style={[styles.breakdownTitle, { color: colors.textMuted }]}>
            CÁLCULO DEL DINERO LIBRE:
          </Text>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Disponible en cuentas</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(data.availableCash, currency, isPrivacyHidden)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.expense }]}>(-) Facturas y compromisos</Text>
            <Text style={[styles.breakdownValue, { color: colors.expense }]}>
              -{formatCurrency(data.upcomingBills, currency, isPrivacyHidden)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>(-) Ahorros reservados</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(data.allocatedSavings, currency, isPrivacyHidden)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.breakdownRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Dinero Seguro para Gastar</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>
              {formatCurrency(data.safeToSpendTotal, currency, isPrivacyHidden)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  amount: {
    fontSize: 31,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  sublineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyRateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dailyRateText: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingLeft: 8,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
