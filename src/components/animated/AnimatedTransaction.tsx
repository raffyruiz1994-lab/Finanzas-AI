import React from 'react';
import {
  Pressable,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutRight,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '@/utils/haptics';
import { SPRING_CONFIG_SNAPPY } from '@/animations/transitions';

interface AnimatedTransactionProps {
  children: React.ReactNode;
  index?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedTransaction: React.FC<AnimatedTransactionProps> = ({
  children,
  index = 0,
  onPress,
  onLongPress,
  style,
  scaleTo = 0.98,
}) => {
  const scale = useSharedValue(1);

  const animatedScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withSpring(scaleTo, SPRING_CONFIG_SNAPPY);
    haptic.selection();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_CONFIG_SNAPPY);
  };

  // Staggered entry for smoother list feel
  const delay = Math.min(index * 35, 280);

  return (
    <AnimatedPressable
      entering={FadeInDown.delay(delay).springify().damping(18)}
      exiting={FadeOutRight.duration(220)}
      layout={LinearTransition.springify().damping(18)}
      style={[style, animatedScaleStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {children}
    </AnimatedPressable>
  );
};

