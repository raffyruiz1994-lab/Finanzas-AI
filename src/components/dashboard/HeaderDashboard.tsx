import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { useRouter } from 'expo-router';

const PERIODS = [
  'JUN DE 2026',
  'JUL DE 2026',
  'AGO DE 2026',
  'SEP DE 2026',
  'OCT DE 2026',
  'NOV DE 2026',
  'DIC DE 2026',
];

interface HeaderDashboardProps {
  onPeriodPress?: () => void;
  onProfilePress?: () => void;
}

export const HeaderDashboard: React.FC<HeaderDashboardProps> = ({
  onPeriodPress,
  onProfilePress,
}) => {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currentPeriod = useSettingsStore((state) => state.currentPeriod);
  const setCurrentPeriod = useSettingsStore((state) => state.setCurrentPeriod);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);
  const togglePrivacyHidden = useSettingsStore((state) => state.togglePrivacyHidden);

  const currentIndex = PERIODS.indexOf(currentPeriod);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentPeriod(PERIODS[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < PERIODS.length - 1) {
      setCurrentPeriod(PERIODS[currentIndex + 1]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Brand logo & title */}
      <View style={styles.brandRow}>
        <View style={[styles.logoIconContainer, { backgroundColor: colors.primaryGlow }]}>
          <Ionicons name="trending-up" size={22} color={colors.primary} />
        </View>
        <Text style={[styles.brandTitle, { color: colors.text }]}>Finanzas AI</Text>
      </View>

      {/* Period Navigator: < SEP DE 2026 > */}
      <View style={[styles.periodNavigator, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable
          onPress={handlePrev}
          hitSlop={10}
          style={styles.arrowButton}
          disabled={currentIndex <= 0}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={currentIndex > 0 ? colors.text : colors.textMuted}
          />
        </Pressable>

        <Pressable onPress={onPeriodPress || handleNext}>
          <Text style={[styles.periodText, { color: colors.text }]}>{currentPeriod}</Text>
        </Pressable>

        <Pressable
          onPress={handleNext}
          hitSlop={10}
          style={styles.arrowButton}
          disabled={currentIndex >= PERIODS.length - 1}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={currentIndex < PERIODS.length - 1 ? colors.text : colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Action buttons: Privacy Eye & Profile */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={togglePrivacyHidden}
          style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Ionicons
            name={isPrivacyHidden ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={isPrivacyHidden ? colors.primary : colors.textSecondary}
          />
        </Pressable>

        <Pressable
          onPress={() => onProfilePress ? onProfilePress() : router.push('/(tabs)/settings')}
          style={[styles.profileButton, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="person-outline" size={18} color={colors.text} />
          <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  periodNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  arrowButton: {
    padding: 2,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0D0C0A',
  },
});
