import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptic } from '@/utils/haptics';
import { SPRING_CONFIG_SNAPPY, isReduceMotion } from '@/animations/transitions';

interface UseScalePressOptions {
  scaleTo?: number;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  disabled?: boolean;
}

export function useScalePress(options: UseScalePressOptions = {}) {
  const { scaleTo = 0.96, hapticType = 'light', disabled = false } = options;
  const scale = useSharedValue(1);

  const onPressIn = () => {
    if (disabled) return;
    scale.value = withSpring(
      isReduceMotion() ? 1 : scaleTo,
      SPRING_CONFIG_SNAPPY
    );

    if (hapticType === 'light') haptic.light();
    else if (hapticType === 'medium') haptic.medium();
    else if (hapticType === 'heavy') haptic.heavy();
    else if (hapticType === 'selection') haptic.selection();
  };

  const onPressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, SPRING_CONFIG_SNAPPY);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    scale,
    onPressIn,
    onPressOut,
    animatedStyle,
  };
}
