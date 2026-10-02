import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInRight,
  FadeOut,
  FadeOutDown,
  FadeOutRight,
  LinearTransition,
} from 'react-native-reanimated';
import { getStaggerDelay, isReduceMotion } from '@/animations/transitions';

export type MotionPreset =
  | 'fade'
  | 'slideUp'
  | 'slideDown'
  | 'slideRight'
  | 'scale';

interface MotionViewProps {
  children: React.ReactNode;
  preset?: MotionPreset;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  enableLayoutTransition?: boolean;
}

export const MotionView: React.FC<MotionViewProps> = ({
  children,
  preset = 'slideUp',
  index,
  delay = 0,
  style,
  enableLayoutTransition = true,
}) => {
  const calculatedDelay =
    typeof index === 'number' ? getStaggerDelay(index) : delay;

  const getEnteringAnimation = () => {
    if (isReduceMotion()) {
      return FadeIn.duration(150);
    }

    switch (preset) {
      case 'fade':
        return calculatedDelay > 0
          ? FadeIn.delay(calculatedDelay).duration(280)
          : FadeIn.duration(280);
      case 'slideDown':
        return calculatedDelay > 0
          ? FadeInUp.delay(calculatedDelay).springify().damping(18)
          : FadeInUp.springify().damping(18);
      case 'slideRight':
        return calculatedDelay > 0
          ? FadeInRight.delay(calculatedDelay).springify().damping(18)
          : FadeInRight.springify().damping(18);
      case 'scale':
        return calculatedDelay > 0
          ? FadeIn.delay(calculatedDelay).springify().damping(16)
          : FadeIn.springify().damping(16);
      case 'slideUp':
      default:
        return calculatedDelay > 0
          ? FadeInDown.delay(calculatedDelay).springify().damping(18)
          : FadeInDown.springify().damping(18);
    }
  };

  const getExitingAnimation = () => {
    if (isReduceMotion()) {
      return FadeOut.duration(120);
    }

    switch (preset) {
      case 'slideRight':
        return FadeOutRight.duration(200);
      case 'slideDown':
      case 'slideUp':
        return FadeOutDown.duration(200);
      case 'fade':
      case 'scale':
      default:
        return FadeOut.duration(180);
    }
  };

  return (
    <Animated.View
      entering={getEnteringAnimation()}
      exiting={getExitingAnimation()}
      layout={
        enableLayoutTransition
          ? LinearTransition.springify().damping(18)
          : undefined
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
};
