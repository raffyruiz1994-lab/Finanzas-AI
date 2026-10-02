import React, { useEffect } from 'react';
import { StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface TabScreenTransitionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const TabScreenTransition: React.FC<TabScreenTransitionProps> = ({
  children,
  style,
}) => {
  const pathname = usePathname();
  const opacity = useSharedValue(0.92);
  const translateY = useSharedValue(10);
  const scale = useSharedValue(0.985);

  useEffect(() => {
    // Subtle physical spring entry when route/tab becomes active
    opacity.value = 0.92;
    translateY.value = 10;
    scale.value = 0.985;

    opacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 220,
    });
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 220,
    });
  }, [pathname]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
