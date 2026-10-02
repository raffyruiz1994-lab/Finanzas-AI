import React, { useEffect, useRef, useState } from 'react';
import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';

interface AnimatedNumberProps extends TextProps {
  value: number;
  currencyPrefix?: string;
  decimals?: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  isPrivacyHidden?: boolean;
  formatter?: (value: number) => string;
}

// Ease out cubic function for natural decelerating motion
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  currencyPrefix = '',
  decimals = 2,
  duration = 500,
  style,
  isPrivacyHidden = false,
  formatter,
  ...textProps
}) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const animRef = useRef<number | null>(null);

  // Micro spring scale pulse when number updates
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    if (isPrivacyHidden) return;

    const startValue = prevValueRef.current;
    const endValue = value;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    // Trigger subtle physical bounce
    scale.value = withSequence(
      withTiming(1.04, { duration: 80 }),
      withSpring(1, { damping: 14, stiffness: 240 })
    );

    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }

    const startTime = Date.now();

    const updateFrame = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(progress);

      const current = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(updateFrame);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [value, duration, isPrivacyHidden]);

  if (isPrivacyHidden) {
    return (
      <Text style={style} {...textProps}>
        {currencyPrefix}••••••
      </Text>
    );
  }

  const formatted = formatter
    ? formatter(displayValue)
    : `${currencyPrefix ? `${currencyPrefix} ` : ''}${displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;

  return (
    <Animated.Text style={[style, animatedStyle]} {...textProps}>
      {formatted}
    </Animated.Text>
  );
};
