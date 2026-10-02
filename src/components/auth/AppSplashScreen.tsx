import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface AppSplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // ms to display
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onFinish,
  minDuration = 2200,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrada suave del logo y textos
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Pulso sutil y continuo del isotipo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Temporizador de finalización con fade-out elegante
    const timer = setTimeout(() => {
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        pulseLoop.stop();
        if (onFinish) {
          onFinish();
        }
      });
    }, minDuration);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitFadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0C0A" />

      {/* Fondo con degradado sutil de obsidiana a carbón cálido */}
      <LinearGradient
        colors={['#0D0C0A', '#13110E', '#0D0C0A']}
        style={StyleSheet.absoluteFill}
      />

      {/* Resplandor radial de fondo */}
      <View style={styles.glowCircle} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Isotipo Finanzas AI con pulso */}
        <Animated.View style={[styles.logoBadge, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoBarsContainer}>
            {/* 4 barras ascendentes redondeadas con degradados cálidos */}
            <View style={[styles.logoBar, styles.bar1]} />
            <View style={[styles.logoBar, styles.bar2]} />
            <View style={[styles.logoBar, styles.bar3]} />
            <View style={[styles.logoBar, styles.bar4]} />
          </View>
          {/* Chispa AI en la cima de la barra más alta */}
          <View style={styles.sparkleBadge}>
            <Ionicons name="sparkles" size={14} color="#FFFDF5" />
          </View>
        </Animated.View>

        {/* Nombre de la marca */}
        <View style={styles.titleRow}>
          <Text style={styles.brandTitle}>Finanzas</Text>
          <View style={styles.aiTag}>
            <Text style={styles.aiTagText}>AI</Text>
          </View>
        </View>

        {/* Subtítulo */}
        <Text style={styles.subtitle}>Inteligencia Financiera Personal</Text>
      </Animated.View>

      {/* Spinner y estado de carga inferior */}
      <View style={styles.footer}>
        <View style={styles.spinnerBox}>
          <ActivityIndicator size="small" color="#FF6800" />
        </View>
        <Text style={styles.loadingText}>Iniciando tus finanzas seguras...</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    backgroundColor: '#0D0F15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    backgroundColor: 'rgba(255, 104, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 0, 0.1)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 104,
    height: 104,
    borderRadius: 28,
    backgroundColor: '#181B24',
    borderWidth: 1.5,
    borderColor: '#2B3142',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6800',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  logoBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 52,
    gap: 6,
  },
  logoBar: {
    width: 8,
    borderRadius: 999,
  },
  bar1: {
    height: 20,
    backgroundColor: '#E65100',
  },
  bar2: {
    height: 32,
    backgroundColor: '#FF5500',
  },
  bar3: {
    height: 44,
    backgroundColor: '#FF6800',
  },
  bar4: {
    height: 52,
    backgroundColor: '#FDE047',
  },
  sparkleBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FF6800',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  aiTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FF6800',
    borderRadius: 8,
    shadowColor: '#FF6800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  aiTagText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 54,
    alignItems: 'center',
    gap: 12,
  },
  spinnerBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 104, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 104, 0, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
