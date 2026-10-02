import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '@/utils/haptics';
import { SPRING_CONFIG_SNAPPY } from '@/animations/transitions';

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  activeScale?: number;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection' | 'warning' | 'success' | 'none';
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'warning' | 'success' | 'none';
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.96,
  activeScale,
  hapticType,
  hapticFeedback,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}) => {
  const scale = useSharedValue(1);
  const targetScale = activeScale ?? scaleTo;
  const effectiveHaptic = hapticFeedback ?? hapticType ?? 'light';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(targetScale, SPRING_CONFIG_SNAPPY);
    if (effectiveHaptic === 'light') haptic.light();
    else if (effectiveHaptic === 'medium') haptic.medium();
    else if (effectiveHaptic === 'heavy') haptic.heavy();
    else if (effectiveHaptic === 'selection') haptic.selection();
    else if (effectiveHaptic === 'warning') haptic.warning();
    else if (effectiveHaptic === 'success') haptic.success();

    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (disabled) return;
    scale.value = withSpring(1, SPRING_CONFIG_SNAPPY);
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
};
