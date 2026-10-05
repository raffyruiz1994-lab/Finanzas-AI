import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useUIStore } from '@/store/useUIStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { NewTransactionModal } from '@/components/modals/NewTransactionModal';
import { tabySoundService } from '@/services/taby/tabySoundService';
import { tabySpeechService } from '@/services/taby/tabySpeechService';
import { tabyAudioRecorderService } from '@/services/taby/tabyAudioRecorderService';
import { tabyAIService } from '@/services/taby/tabyAIService';
import { PressableScale } from '@/components/animated/PressableScale';
import * as Haptics from 'expo-haptics';

interface TabItemProps {
  name: string;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  isActive: boolean;
  onPress: () => void;
  colors: any;
}

function TabItemWithAnimation({
  label,
  iconActive,
  iconInactive,
  isActive,
  onPress,
  colors,
}: TabItemProps) {
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      iconScale.value = withSequence(
        withTiming(1.18, { duration: 90 }),
        withSpring(1, { damping: 14, stiffness: 220 })
      );
    }
  }, [isActive]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <PressableScale
      onPress={onPress}
      style={styles.tabItem}
      hapticType="selection"
      scaleTo={0.92}
    >
      <Animated.View style={animatedIconStyle}>
        <Ionicons
          name={isActive ? iconActive : iconInactive}
          size={22}
          color={isActive ? colors.tabBarActive : colors.tabBarInactive}
        />
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          { color: isActive ? colors.tabBarActive : colors.tabBarInactive },
          isActive && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const openNewTxModal = useFinanceStore((s) => s.openNewTxModal);
  const openCrearPlanModal = useFinanceStore((s) => s.openCrearPlanModal);
  const isTabyActive = useUIStore((s) => s.isTabyActive);
  const triggerTabyVoice = useUIStore((s) => s.triggerTabyVoice);
  const tabyState = useUIStore((s) => s.tabyState);

  // Adaptación dinámica de altura para que nunca se recorte
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);
  const baseTabHeight = Platform.OS === 'ios' ? 52 : 56;
  const totalBarHeight = baseTabHeight + bottomInset;

  const getRouteIndex = (name: string) => state.routes.findIndex((r: any) => r.name === name);

  const isCurrent = (name: string) => {
    const idx = getRouteIndex(name);
    return state.index === idx;
  };

  const [isMicRecording, setIsMicRecording] = React.useState(false);
  const isRecordingRef = React.useRef(false);
  const pressStartTimeRef = React.useRef(0);
  const isHoldingRef = React.useRef(false);
  const holdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-calentar sistema de audio apenas Taby esté activo
  React.useEffect(() => {
    if (isTabyActive) {
      tabyAudioRecorderService.prewarm();
    } else {
      if (isRecordingRef.current) {
        stopAndProcessRecording(true);
      }
    }
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, [isTabyActive]);

  const startRecordingSession = async () => {
    if (isRecordingRef.current) return;

    // Detener cualquier voz activa de Taby para escuchar atentamente
    tabySpeechService.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    isRecordingRef.current = true;
    setIsMicRecording(true);
    useUIStore.getState().setIsTabyListening(true);
    useUIStore.getState().setTabyState('listening');

    const result = await tabyAudioRecorderService.start();
    if (!result.success) {
      isRecordingRef.current = false;
      setIsMicRecording(false);
      useUIStore.getState().setIsTabyListening(false);
      useUIStore.getState().setTabyState('idle');

      if (result.isPermissionDenied) {
        useUIStore.getState().showToast({
          type: 'warning',
          message: 'Permiso de micrófono requerido para hablar con Taby',
        });
      } else {
        useUIStore.getState().showToast({
          type: 'warning',
          message: result.error || 'No se pudo iniciar la grabación',
        });
      }
    }
  };

  const stopAndProcessRecording = async (abortOnly: boolean = false) => {
    if (!isRecordingRef.current && !tabyAudioRecorderService.isRecording()) return;

    isRecordingRef.current = false;
    setIsMicRecording(false);
    useUIStore.getState().setIsTabyListening(false);

    if (abortOnly) {
      await tabyAudioRecorderService.stop();
      useUIStore.getState().setTabyState('idle');
      return;
    }

    // Detener la grabadora nativa PRIMERO y capturar el URI antes de disparar el estado de pensamiento
    let audioUri: string | null = null;
    try {
      audioUri = await tabyAudioRecorderService.stop();
    } catch (e) {
      console.warn('[Taby] Error al detener grabadora:', e);
    }

    if (!audioUri) {
      useUIStore.getState().setTabyState('idle');
      return;
    }

    // Ahora que el archivo de audio está cerrado y seguro en disco, pasar a pensar
    useUIStore.getState().setTabyState('thinking');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Procesar audio real con Gemini
      const result = await tabyAIService.processAudio(audioUri);
      useUIStore.getState().setTabyState('talking');
      useUIStore.getState().triggerTabyAction({
        type: (result.emotion as any) || (result.success ? 'celebrate' : 'talking'),
        text: result.reply,
        speechText: result.speechText || result.reply,
      });
    } catch (err) {
      console.warn('[Taby] Error processing recording:', err);
      useUIStore.getState().setTabyState('talking');
      useUIStore.getState().triggerTabyAction({
        type: 'talking',
        text: 'No logré entender el audio. Intenta de nuevo.',
        speechText: 'No logré entender el audio. Intenta de nuevo.',
      });
    }
  };

  const handleMicPressIn = () => {
    if (!isTabyActive) return;

    // Si ya estaba grabando, al presionar se detiene y procesa
    if (isRecordingRef.current) {
      stopAndProcessRecording();
      return;
    }

    pressStartTimeRef.current = Date.now();
    isHoldingRef.current = false;

    startRecordingSession();

    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
    }, 280);
  };

  const handleMicPressOut = () => {
    if (!isTabyActive) return;

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (!isRecordingRef.current) return;

    const duration = Date.now() - pressStartTimeRef.current;
    isHoldingRef.current = false;

    // Si el toque fue extremadamente rápido (< 250ms), cancelar sin error para no trabar
    if (duration < 250) {
      stopAndProcessRecording(true);
      return;
    }

    // Procesar grabación normalmente
    stopAndProcessRecording(false);
  };

  const handleCenterFabPress = () => {
    const currentRoute = state.routes[state.index]?.name;
    if (currentRoute === 'accounts') {
      openCrearPlanModal();
    } else {
      openNewTxModal();
    }
  };

  const navigateTo = (name: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: state.routes.find((r: any) => r.name === name)?.key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(name);
    }
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          height: totalBarHeight,
          paddingBottom: bottomInset,
        },
      ]}
    >
      {/* 1. Inicio */}
      <TabItemWithAnimation
        name="index"
        label="Inicio"
        iconActive="home"
        iconInactive="home-outline"
        isActive={isCurrent('index')}
        onPress={() => navigateTo('index')}
        colors={colors}
      />

      {/* 2. Presupuestos */}
      <TabItemWithAnimation
        name="accounts"
        label="Presupuestos"
        iconActive="wallet"
        iconInactive="wallet-outline"
        isActive={isCurrent('accounts')}
        onPress={() => navigateTo('accounts')}
        colors={colors}
      />

      {/* 3. Floating '+' Button / Microphone when Taby is active */}
      <View style={[styles.fabWrapper, isTabyActive && styles.fabWrapperTaby]}>
        {isTabyActive ? (
          <Pressable
            onPressIn={handleMicPressIn}
            onPressOut={handleMicPressOut}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={({ pressed }) => [
              styles.fabButton,
              { borderColor: colors.tabBarBg },
              styles.fabButtonTaby,
              pressed && { transform: [{ scale: 0.92 }] },
            ]}
          >
            <LinearGradient
              colors={
                isMicRecording
                  ? ['#EF4444', '#DC2626']
                  : ['#FF6B00', '#FF8A00']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.fabGradient, styles.fabGradientTaby]}
            >
              <Ionicons
                name={isMicRecording ? 'mic' : 'mic-outline'}
                size={28}
                color="#FFFFFF"
              />
            </LinearGradient>
          </Pressable>
        ) : (
          <PressableScale
            onPress={handleCenterFabPress}
            style={[
              styles.fabButton,
              { borderColor: colors.tabBarBg },
            ]}
            scaleTo={0.88}
            hapticType="medium"
          >
            <LinearGradient
              colors={['#FF6B00', '#FF8A00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Ionicons
                name="add"
                size={28}
                color="#FFFFFF"
              />
            </LinearGradient>
          </PressableScale>
        )}
      </View>

      {/* 4. Estadísticas */}
      <TabItemWithAnimation
        name="stats"
        label="Estadísticas"
        iconActive="stats-chart"
        iconInactive="stats-chart-outline"
        isActive={isCurrent('stats')}
        onPress={() => navigateTo('stats')}
        colors={colors}
      />

      {/* 5. Ajustes */}
      <TabItemWithAnimation
        name="settings"
        label="Ajustes"
        iconActive="settings"
        iconInactive="settings-outline"
        isActive={isCurrent('settings')}
        onPress={() => navigateTo('settings')}
        colors={colors}
      />
    </View>
  );
}

export default function TabsLayout() {
  const isNewTxModalOpen = useFinanceStore((state) => state.isNewTxModalOpen);
  const closeNewTxModal = useFinanceStore((state) => state.closeNewTxModal);
  const newTxInitialCategory = useFinanceStore((state) => state.newTxInitialCategory);
  const isCrearPlanModalOpen = useFinanceStore((state) => state.isCrearPlanModalOpen);
  const activeBottomSheet = useUIStore((state) => state.activeBottomSheet);

  // Background stack depth animation when modal is active
  const isModalActive = isNewTxModalOpen || isCrearPlanModalOpen || !!activeBottomSheet;
  const bgScale = useSharedValue(1);
  const bgRadius = useSharedValue(0);
  const bgOpacity = useSharedValue(1);

  useEffect(() => {
    if (isModalActive) {
      bgScale.value = withSpring(0.95, { damping: 20, stiffness: 200 });
      bgRadius.value = withSpring(24, { damping: 20, stiffness: 200 });
      bgOpacity.value = withTiming(0.88, { duration: 240 });
    } else {
      bgScale.value = withSpring(1, { damping: 22, stiffness: 240 });
      bgRadius.value = withSpring(0, { damping: 22, stiffness: 240 });
      bgOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isModalActive]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bgScale.value }],
    borderRadius: bgRadius.value,
    opacity: bgOpacity.value,
    overflow: 'hidden',
  }));

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <Animated.View style={[{ flex: 1 }, animatedContainerStyle]}>
        <Tabs
          tabBar={(props) => <CustomTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
          <Tabs.Screen name="accounts" options={{ title: 'Presupuestos' }} />
          <Tabs.Screen name="stats" options={{ title: 'Estadísticas' }} />
          <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
        </Tabs>
      </Animated.View>

      <NewTransactionModal
        visible={isNewTxModalOpen}
        onClose={closeNewTxModal}
        initialCategoryId={newTxInitialCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#111319',
    borderTopColor: '#222634',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
  },
  tabItem: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#94A3B8',
  },
  tabLabelActive: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -16,
  },
  fabButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#111319',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.48,
    shadowRadius: 10,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabWrapperTaby: {
    top: -22,
  },
  fabButtonTaby: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    shadowColor: '#FF6800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.65,
    shadowRadius: 16,
    elevation: 12,
  },
  fabGradientTaby: {
    borderRadius: 28,
  },
});
