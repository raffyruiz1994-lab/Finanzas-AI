import React from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SPRING_CONFIG_SNAPPY } from '@/animations/transitions';
import { PressableScale } from './PressableScale';

interface AnimatedTabProps {
  tabs: string[];
  activeTab: string;
  onChangeTab: (tab: string) => void;
  accentColor?: string;
}

export const AnimatedTab: React.FC<AnimatedTabProps> = ({
  tabs,
  activeTab,
  onChangeTab,
  accentColor = '#FF6B00',
}) => {
  const containerWidth = useSharedValue(0);
  const activeIndex = Math.max(0, tabs.indexOf(activeTab));

  const handleLayout = (e: LayoutChangeEvent) => {
    containerWidth.value = e.nativeEvent.layout.width;
  };

  const tabWidth = containerWidth.value > 0 ? containerWidth.value / tabs.length : 0;

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    if (tabs.length === 0 || containerWidth.value === 0) {
      return { opacity: 0 };
    }
    const width = containerWidth.value / tabs.length;
    const translateX = withSpring(activeIndex * width, SPRING_CONFIG_SNAPPY);

    return {
      width,
      transform: [{ translateX }],
      opacity: 1,
    };
  });

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {/* Sliding Active Indicator Pill */}
      <Animated.View
        style={[
          styles.activeIndicator,
          { backgroundColor: accentColor },
          animatedIndicatorStyle,
        ]}
      />

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <PressableScale
              key={tab}
              onPress={() => onChangeTab(tab)}
              style={styles.tabBtn}
              scaleTo={0.96}
              hapticType="selection"
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E222D',
    borderRadius: 999,
    padding: 3,
    position: 'relative',
    height: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    zIndex: 2,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
