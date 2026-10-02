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
import { PressableScale } from '@/components/animated';

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

  const getRouteIndex = (name: string) => state.routes.findIndex((r: any) => r.name === name);

  const isCurrent = (name: string) => {
    const idx = getRouteIndex(name);
    return state.index === idx;
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
          shadowColor: colors.cardShadow,
          shadowOpacity: isDark ? 0.45 : 0.08,
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      {/* 1. Inicio */}
      <TabItemWithAnimation
        name="index"
        label="Inicio"
        iconActive="grid"
        iconInactive="grid-outline"
        isActive={isCurrent('index')}
        onPress={() => navigateTo('index')}
        colors={colors}
      />

      {/* 2. Presupuestos (accounts) */}
      <TabItemWithAnimation
        name="accounts"
        label="Presupuestos"
        iconActive="wallet"
        iconInactive="wallet-outline"
        isActive={isCurrent('accounts')}
        onPress={() => navigateTo('accounts')}
        colors={colors}
      />

      {/* 3. Floating '+' Button in Radiant Amber */}
      <View style={styles.fabWrapper}>
        <PressableScale
          onPress={handleCenterFabPress}
          style={[styles.fabButton, { borderColor: colors.tabBarBg }]}
          scaleTo={0.88}
          hapticType="medium"
        >
          <LinearGradient
            colors={['#FF6B00', '#FF8A00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </PressableScale>
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
    height: Platform.OS === 'ios' ? 84 : 64,
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
});
