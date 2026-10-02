import React from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  FadeInDown,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '@/utils/haptics';
import { SPRING_CONFIG_SNAPPY } from '@/animations/transitions';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
  pressable?: boolean;
  scaleTo?: number;
  activeScale?: number;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  style,
  onPress,
  onLongPress,
  pressable = false,
  scaleTo = 0.98,
  activeScale,
  hapticType = 'light',
}) => {
  const scale = useSharedValue(1);
  const targetScale = activeScale ?? scaleTo;

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!pressable && !onPress) return;
    scale.value = withSpring(targetScale, SPRING_CONFIG_SNAPPY);
    if (hapticType === 'light') haptic.light();
    else if (hapticType === 'medium') haptic.medium();
    else if (hapticType === 'heavy') haptic.heavy();
    else if (hapticType === 'selection') haptic.selection();
  };

  const handlePressOut = () => {
    if (!pressable && !onPress) return;
    scale.value = withSpring(1, SPRING_CONFIG_SNAPPY);
  };

  const entering = delay > 0 ? FadeInDown.delay(delay).springify().damping(18) : FadeInDown.springify().damping(18);

  if (pressable || onPress) {
    return (
      <Animated.View
        entering={entering}
        layout={LinearTransition.springify().damping(18).stiffness(140)}
      >
        <AnimatedPressable
          style={[style, animatedScaleStyle]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          onLongPress={onLongPress}
        >
          {children}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={entering}
      layout={LinearTransition.springify().damping(18).stiffness(140)}
      style={style}
    >
      {children}
    </Animated.View>
  );
};
