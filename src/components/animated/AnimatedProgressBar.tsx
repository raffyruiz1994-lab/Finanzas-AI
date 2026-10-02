import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SPRING_CONFIG_SMOOTH } from '@/animations/transitions';

interface AnimatedProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  trackColor?: string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  color = '#FF6B00',
  trackColor = 'rgba(255, 255, 255, 0.08)',
  height = 8,
  borderRadius = 4,
  style,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const animatedWidth = useSharedValue(clampedProgress);

  useEffect(() => {
    animatedWidth.value = withSpring(clampedProgress, SPRING_CONFIG_SMOOTH);
  }, [clampedProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius,
          backgroundColor: trackColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            borderRadius,
            backgroundColor: color,
          },
          fillStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
});

