import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { SPRING_CONFIG_BOUNCY } from '@/animations/transitions';

interface AnimatedIconProps {
  name: any;
  size?: number;
  color?: string;
  animation?: 'pulse' | 'bounce' | 'rotate' | 'none';
  trigger?: any;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  name,
  size = 20,
  color = '#FFFFFF',
  animation = 'none',
  trigger,
  style,
}) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (animation === 'bounce') {
      scale.value = withSequence(
        withSpring(1.3, SPRING_CONFIG_BOUNCY),
        withSpring(1.0, SPRING_CONFIG_BOUNCY)
      );
    } else if (animation === 'pulse') {
      scale.value = withSequence(
        withTiming(1.15, { duration: 150 }),
        withTiming(1.0, { duration: 150 })
      );
    } else if (animation === 'rotate') {
      rotation.value = withTiming(rotation.value + 360, { duration: 500 });
    }
  }, [trigger, animation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

