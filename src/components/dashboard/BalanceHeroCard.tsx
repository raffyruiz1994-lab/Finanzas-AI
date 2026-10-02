import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatCurrency, formatCurrencySigned } from '@/utils/formatters';

interface BalanceHeroCardProps {
  availableBalance: number;
  totalIncome: number;
  totalExpense: number;
  availablePercentage?: number;
  onInfoPress?: () => void;
}

export const BalanceHeroCard: React.FC<BalanceHeroCardProps> = ({
  availableBalance,
  totalIncome,
  totalExpense,
  availablePercentage = 90,
  onInfoPress,
}) => {
  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);
  const togglePrivacyHidden = useSettingsStore((state) => state.togglePrivacyHidden);
  const currentPeriod = useSettingsStore((state) => state.currentPeriod);

  return (
    <View style={styles.outerShadowWrapper}>
      <LinearGradient
        colors={['#C2410C', '#EA580C', '#F97316', '#FB923C']}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.9 }}
        style={styles.cardContainer}
      >
        {/* Subtle decorative curved lines matching media_1790727631125.png */}
        <View style={styles.waveOverlay1} pointerEvents="none" />
        <View style={styles.waveOverlay2} pointerEvents="none" />

        {/* 1. Top row: "Balance Disponible" + [Eye Icon] on left, [SEPT 2026] on right */}
        <View style={styles.topRow}>
          <View style={styles.topLeftGroup}>
            <Text style={styles.label}>Balance Disponible</Text>
            <Pressable
              onPress={togglePrivacyHidden}
              style={({ pressed }) => [styles.eyePill, pressed && { opacity: 0.7 }]}
              hitSlop={8}
            >
              <Ionicons
                name={isPrivacyHidden ? 'eye-off' : 'eye'}
                size={13}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* Period Pill Badge */}
          <View style={styles.periodPill}>
            <Text style={styles.periodText}>{currentPeriod}</Text>
          </View>
        </View>

        {/* 2. Main big amount: RD$ 101,595.00 in ultra-bold crisp white */}
        <Text style={styles.mainAmount} numberOfLines={1} adjustsFontSizeToFit>
          {formatCurrency(availableBalance, currency, isPrivacyHidden)}
        </Text>

        {/* 3. Progress Bar with DISPONIBLE and Percentage */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>DISPONIBLE</Text>
            <Text style={styles.progressPercentage}>{availablePercentage}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(0, availablePercentage))}%` },
              ]}
            />
          </View>
        </View>

        {/* 4. Split Subcards: INGRESOS & GASTOS */}
        <View style={styles.splitRow}>
          {/* Subcard INGRESOS */}
          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <View style={styles.incomeIconCircle}>
                <Ionicons name="arrow-up" size={11} color="#FFFFFF" />
              </View>
              <Text style={styles.subCardLabel}>INGRESOS</Text>
            </View>
            <Text style={styles.subCardAmount} numberOfLines={1}>
              {formatCurrencySigned(totalIncome, 'income', currency, isPrivacyHidden)}
            </Text>
          </View>

          {/* Subcard GASTOS */}
          <View style={styles.subCard}>
            <View style={styles.subCardHeader}>
              <View style={styles.expenseIconCircle}>
                <Ionicons name="arrow-down" size={11} color="#FFFFFF" />
              </View>
              <Text style={styles.subCardLabel}>GASTOS</Text>
            </View>
            <Text style={styles.subCardAmount} numberOfLines={1}>
              {formatCurrencySigned(totalExpense, 'expense', currency, isPrivacyHidden)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShadowWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  cardContainer: {
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  waveOverlay1: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    top: -160,
    right: -100,
  },
  waveOverlay2: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    top: -80,
    left: -120,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  eyePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  periodText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainAmount: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
    marginTop: 4,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  progressPercentage: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBackground: {
    height: 5.5,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34E4C5', // Neón turquesa / menta brillante idéntico a la imagen
    borderRadius: 999,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  subCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 12, 2, 0.38)', // Cápsula oscura translúcida idéntica a la imagen
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  incomeIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseIconCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subCardLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subCardAmount: {
    color: '#FFFFFF', // Blanco nítido ultra legible
    fontSize: 16.5,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
});
