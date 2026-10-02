import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { SPRING_CONFIG_SMOOTH, SPRING_CONFIG_SNAPPY } from '@/animations/transitions';
import { haptic } from '@/utils/haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AppBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxHeight?: number;
  children: React.ReactNode;
}

export const AppBottomSheet: React.FC<AppBottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  maxHeight = SCREEN_HEIGHT * 0.75,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG_SMOOTH);
      backdropOpacity.value = withTiming(1, { duration: 250 });
      haptic.light();
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 200 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const handleDismiss = () => {
    haptic.light();
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 600) {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG_SNAPPY);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalRoot}>
        {/* Animated Dark Backdrop */}
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        {/* Pan Gesture Sheet Card */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheetCard,
              {
                maxHeight,
                paddingBottom: Math.max(insets.bottom, 16),
              },
              sheetAnimatedStyle,
            ]}
          >
            {/* Top Drag Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Optional Header Row */}
            {title ? (
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.titleText}>{title}</Text>
                  {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
                </View>
                <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </Pressable>
              </View>
            ) : null}

            {/* Content Area */}
            <View style={styles.content}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheetCard: {
    width: '100%',
    backgroundColor: '#151821',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  handleContainer: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subtitleText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
