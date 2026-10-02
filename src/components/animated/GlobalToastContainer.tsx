import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore, ToastItem } from '@/store/useUIStore';

const TOAST_ICONS: Record<ToastItem['type'], any> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'alert-circle',
  info: 'information-circle',
};

const TOAST_COLORS: Record<ToastItem['type'], { border: string; bg: string; icon: string }> = {
  success: {
    border: 'rgba(16, 185, 129, 0.45)',
    bg: '#0F1E19',
    icon: '#10B981',
  },
  error: {
    border: 'rgba(239, 68, 68, 0.45)',
    bg: '#201315',
    icon: '#EF4444',
  },
  warning: {
    border: 'rgba(245, 158, 11, 0.45)',
    bg: '#22190E',
    icon: '#F59E0B',
  },
  info: {
    border: 'rgba(255, 107, 0, 0.45)',
    bg: '#1C1612',
    icon: '#FF6B00',
  },
};

export const GlobalToastContainer: React.FC = () => {
  const insets = useSafeAreaInsets();
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { top: Math.max(insets.top + 6, 16) },
      ]}
    >
      {toasts.map((toast) => {
        const theme = TOAST_COLORS[toast.type] || TOAST_COLORS.info;
        const iconName = TOAST_ICONS[toast.type] || TOAST_ICONS.info;

        return (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.springify().damping(16)}
            exiting={FadeOutUp.duration(180)}
            style={styles.toastWrapper}
          >
            <Pressable
              onPress={() => dismissToast(toast.id)}
              style={[
                styles.toastCard,
                {
                  backgroundColor: theme.bg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons name={iconName} size={22} color={theme.icon} style={styles.icon} />
              <View style={styles.textContainer}>
                {toast.title ? <Text style={styles.titleText}>{toast.title}</Text> : null}
                <Text style={styles.messageText}>{toast.message}</Text>
              </View>
              <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.4)" />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    gap: 8,
  },
  toastWrapper: {
    width: '100%',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12.5,
    color: '#E2E8F0',
    fontWeight: '500',
    lineHeight: 17,
  },
});

