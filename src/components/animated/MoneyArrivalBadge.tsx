import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/utils/haptics';

interface MoneyArrivalBadgeProps {
  type: 'income' | 'expense';
  amount: number;
  currencySymbol?: string;
  categoryName?: string;
  onDismiss?: () => void;
  duration?: number;
}

export const MoneyArrivalBadge: React.FC<MoneyArrivalBadgeProps> = ({
  type,
  amount,
  currencySymbol = 'RD$',
  categoryName,
  onDismiss,
  duration = 3200,
}) => {
  const isIncome = type === 'income';

  // Pulse animation for halo glow
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.7);

  useEffect(() => {
    // Trigger celebratory haptic
    if (isIncome) {
      haptic.success();
      const timer = setTimeout(() => {
        haptic.light();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      haptic.medium();
    }
  }, [isIncome]);

  useEffect(() => {
    // Glowing pulse loop
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 600 }),
        withTiming(1.0, { duration: 600 })
      ),
      3,
      true
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 600 })
      ),
      3,
      true
    );

    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss, pulseScale, pulseOpacity]);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const formatAmount = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(12).stiffness(130)}
      exiting={FadeOutUp.duration(400)}
      style={styles.container}
      pointerEvents="none"
    >
      {/* Ambient Pulsing Glow Halo */}
      <Animated.View
        style={[
          styles.glowHalo,
          isIncome ? styles.glowHaloIncome : styles.glowHaloExpense,
          animatedGlowStyle,
        ]}
      />

      {/* Floating Gradient Pill */}
      <LinearGradient
        colors={
          isIncome
            ? ['#059669', '#10B981', '#34D399']
            : ['#DC2626', '#EA580C', '#FF6B00']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.badgeGradient,
          isIncome ? styles.badgeBorderIncome : styles.badgeBorderExpense,
        ]}
      >
        <View style={styles.badgeLeft}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isIncome ? 'arrow-up-circle' : 'arrow-down-circle'}
              size={20}
              color="#FFFFFF"
            />
          </View>
          <View>
            <Text style={styles.badgeTitle}>
              {isIncome ? '¡Ingreso Añadido!' : 'Gasto Registrado'}
            </Text>
            <Text style={styles.badgeAmount}>
              {isIncome ? '+' : '-'}{currencySymbol}{formatAmount(amount)}
            </Text>
          </View>
        </View>

        {isIncome && (
          <View style={styles.sparkleBadge}>
            <Text style={styles.sparkleText}>✨ +Dinero</Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginVertical: 8,
    zIndex: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: '110%',
    height: '110%',
    borderRadius: 24,
  },
  glowHaloIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
  },
  glowHaloExpense: {
    backgroundColor: 'rgba(255, 107, 0, 0.45)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 220,
    gap: 12,
  },
  badgeBorderIncome: {
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  badgeBorderExpense: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.92)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  badgeAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  sparkleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sparkleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
