import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  FadeOutRight,
  LinearTransition,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/utils/haptics';
import { SPRING_CONFIG_SNAPPY, getStaggerDelay } from '@/animations/transitions';

interface SwipeableTransactionItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  onDelete?: () => void;
  index?: number;
  disabled?: boolean;
}

const ACTION_WIDTH = 75;

export const SwipeableTransactionItem: React.FC<SwipeableTransactionItemProps> = ({
  children,
  onPress,
  onDelete,
  index = 0,
  disabled = false,
}) => {
  const translateX = useSharedValue(0);
  const isOpen = useSharedValue(false);

  const triggerHaptic = () => {
    haptic.selection();
  };

  const triggerDelete = () => {
    haptic.warning();
    onDelete?.();
  };

  const panGesture = Gesture.Pan()
    .enabled(!disabled && !!onDelete)
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        // Swiping left
        translateX.value = Math.max(event.translationX, -ACTION_WIDTH * 1.5);
      } else if (isOpen.value && event.translationX > 0) {
        // Closing back from open state
        translateX.value = Math.min(-ACTION_WIDTH + event.translationX, 0);
      }
    })
    .onEnd((event) => {
      if (event.translationX < -ACTION_WIDTH * 0.6) {
        // Snap open
        translateX.value = withSpring(-ACTION_WIDTH, SPRING_CONFIG_SNAPPY);
        if (!isOpen.value) {
          runOnJS(triggerHaptic)();
          isOpen.value = true;
        }
      } else {
        // Snap closed
        translateX.value = withSpring(0, SPRING_CONFIG_SNAPPY);
        isOpen.value = false;
      }
    });

  const animatedRowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDeleteBtnStyle = useAnimatedStyle(() => {
    const opacity = withTiming(translateX.value < -20 ? 1 : 0, { duration: 150 });
    return {
      opacity,
    };
  });

  const delay = getStaggerDelay(index, 35, 300);

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(18)}
      exiting={FadeOutRight.duration(240)}
      layout={LinearTransition.springify().damping(18)}
      style={styles.container}
    >
      {/* Background Delete Action Underneath */}
      {onDelete && (
        <View style={styles.actionContainer}>
          <Animated.View style={[styles.deleteButtonBox, animatedDeleteBtnStyle]}>
            <Pressable
              onPress={() => {
                translateX.value = withSpring(0, SPRING_CONFIG_SNAPPY);
                isOpen.value = false;
                triggerDelete();
              }}
              style={styles.deleteButton}
              accessibilityLabel="Eliminar movimiento"
            >
              <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* Foreground Swipeable Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.contentRow, animatedRowStyle]}>
          <Pressable
            onPress={() => {
              if (isOpen.value) {
                translateX.value = withSpring(0, SPRING_CONFIG_SNAPPY);
                isOpen.value = false;
              } else {
                onPress?.();
              }
            }}
            style={styles.pressableWrapper}
          >
            {children}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    marginVertical: 4,
    overflow: 'hidden',
    borderRadius: 16,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 16,
    paddingRight: 14,
  },
  deleteButtonBox: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    width: '100%',
    backgroundColor: '#151821',
    borderRadius: 16,
  },
  pressableWrapper: {
    width: '100%',
  },
});
