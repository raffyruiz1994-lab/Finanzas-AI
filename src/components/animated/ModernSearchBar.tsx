import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  Keyboard,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
  FadeInRight,
  FadeOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { haptic } from '@/utils/haptics';
import { SPRING_CONFIG_SNAPPY } from '@/animations/transitions';
import { PressableScale } from './PressableScale';

interface ModernSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  currencyLabel?: string;
  onCurrencyPress?: () => void;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const ModernSearchBar: React.FC<ModernSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Buscar movimientos, categorías...',
  currencyLabel,
  onCurrencyPress,
  onClear,
  style,
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const focusProgress = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    focusProgress.value = withSpring(1, SPRING_CONFIG_SNAPPY);
    haptic.selection();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    focusProgress.value = withSpring(0, SPRING_CONFIG_SNAPPY);
    onBlur?.();
  };

  const handleClear = () => {
    onChangeText('');
    onClear?.();
    haptic.light();
  };

  const handleDismiss = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    haptic.light();
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(focusProgress.value, [0, 1], [1, 1.02]);
    const borderColor = interpolateColor(
      focusProgress.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.18)', '#FF6B00']
    );
    const shadowOpacity = interpolate(focusProgress.value, [0, 1], [0.35, 0.7]);
    const shadowRadius = interpolate(focusProgress.value, [0, 1], [10, 18]);

    return {
      transform: [{ scale }],
      borderColor,
      shadowOpacity,
      shadowRadius,
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusProgress.value, [0, 1], [0, 0.55]);
    const scale = interpolate(focusProgress.value, [0, 1], [0.96, 1.05]);

    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    const iconScale = interpolate(focusProgress.value, [0, 1], [1, 1.15]);
    const rotate = `${interpolate(focusProgress.value, [0, 1], [0, -12])}deg`;

    return {
      transform: [{ scale: iconScale }, { rotate }],
    };
  });

  return (
    <View style={[styles.wrapper, style]}>
      {/* Ambient Radiant Glow Layer behind capsule */}
      <Animated.View
        style={[styles.glowLayer, animatedGlowStyle]}
        pointerEvents="none"
      />

      {/* Main Animated Search Bar Capsule */}
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <Pressable
          style={styles.leftContent}
          onPress={() => inputRef.current?.focus()}
        >
          {/* Animated Search Icon */}
          <Animated.View style={animatedIconStyle}>
            <Ionicons
              name="search"
              size={19}
              color={isFocused ? '#FF8C38' : '#94A3B8'}
            />
          </Animated.View>

          {/* Text Input */}
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor="#FF6B00"
            cursorColor="#FF6B00"
            returnKeyType="search"
            autoCorrect={false}
          />

          {/* Quick Clear 'X' Button */}
          {value.length > 0 && (
            <PressableScale
              onPress={handleClear}
              hitSlop={10}
              hapticType="light"
              style={styles.clearBtn}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </PressableScale>
          )}
        </Pressable>

        {/* Currency Switcher or 'Listo' Dismiss Button */}
        {isFocused ? (
          <Animated.View
            entering={FadeInRight.duration(180)}
            exiting={FadeOutRight.duration(140)}
          >
            <PressableScale
              onPress={handleDismiss}
              style={styles.doneBtn}
              hapticType="selection"
              hitSlop={8}
            >
              <Text style={styles.doneBtnText}>Listo</Text>
            </PressableScale>
          </Animated.View>
        ) : currencyLabel ? (
          <PressableScale
            onPress={onCurrencyPress}
            style={styles.currencyBtn}
            hitSlop={8}
            hapticType="light"
          >
            <Text style={styles.currencyText}>{currencyLabel}</Text>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 107, 0, 0.45)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 8,
  },
  container: {
    backgroundColor: 'rgba(24, 27, 36, 0.95)',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  input: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: {
    paddingHorizontal: 4,
  },
  currencyBtn: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 2,
  },
  currencyText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FDE047',
    letterSpacing: 0.3,
  },
  doneBtn: {
    backgroundColor: 'rgba(255, 107, 0, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 6,
  },
  doneBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FF8C38',
    letterSpacing: 0.3,
  },
});
