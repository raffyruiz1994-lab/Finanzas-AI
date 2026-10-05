import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useUIStore } from '@/store/useUIStore';
import { tabySoundService } from '@/services/taby/tabySoundService';
import { tabySpeechService } from '@/services/taby/tabySpeechService';
import { TabyRiveCanvas } from './TabyRiveCanvas';

interface TabyHeaderIslandProps {
  visible: boolean;
  onClose: () => void;
  insets: { top: number; bottom: number; left: number; right: number };
  activeCategory?: string | null;
  onSelectQuickAction?: (actionText: string) => void;
}

export const TabyHeaderIsland: React.FC<TabyHeaderIslandProps> = ({
  visible,
  onClose,
  insets,
  activeCategory,
}) => {
  const tabyState = useUIStore((s) => s.tabyState);
  const tabyTriggerAction = useUIStore((s) => s.tabyTriggerAction);
  const setTabyStateStore = useUIStore((s) => s.setTabyState);

  const [currentState, setCurrentState] = useState<
    'idle' | 'listening' | 'thinking' | 'talking' | 'celebrate' | 'success'
  >('idle');
  const [displayText, setDisplayText] = useState('En espera... todo tranquilo.');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;
  const returnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronización de visibilidad de la isla
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();

      setCurrentState('idle');
      setDisplayText('En espera... todo tranquilo.');
    } else {
      fadeAnim.setValue(0);
      tabySpeechService.stop();
      setIsSpeaking(false);
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
    }
  }, [visible]);

  // Sincronización de estados desde la barra inferior (listening, thinking, idle, talking)
  useEffect(() => {
    if (!visible) return;

    // Si la voz de IA está hablando activamente, mantener el avatar en talking
    if (isSpeaking) {
      setCurrentState('talking');
      return;
    }

    if (tabyState === 'listening') {
      tabySpeechService.stop();
      setIsSpeaking(false);
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
      setCurrentState('listening');
      setDisplayText('Te escucho... habla con naturalidad.');
    } else if (tabyState === 'thinking') {
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
      setCurrentState('thinking');
      setDisplayText('Procesando con IA...');
    } else if (tabyState === 'talking') {
      setCurrentState('talking');
    } else if (tabyState === 'idle') {
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
      setCurrentState('idle');
      setDisplayText('En espera... todo tranquilo.');
    }
  }, [tabyState, visible, isSpeaking]);

  // Sincronización de respuestas externas de Gemini, sonidos, frases y TTS
  useEffect(() => {
    if (!visible || !tabyTriggerAction) return;
    if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);

    const action = tabyTriggerAction;
    const text = action.text || '';
    const speechText = action.speechText || action.text || '';

    let soundToPlay: any = null;
    if (action.type === 'success' || action.type === 'celebrate') {
      soundToPlay = 'chime';
    } else if (action.type === 'happy') {
      soundToPlay = 'pop';
    } else if (action.type === 'love') {
      soundToPlay = 'twinkle';
    } else if (action.type === 'angry') {
      soundToPlay = 'alarm';
    } else {
      soundToPlay = 'pop';
    }

    // SIEMPRE colocar en 'talking' mientras la voz sintetizada pronuncia el texto
    setCurrentState('talking');
    setDisplayText(text);
    if (soundToPlay) tabySoundService.play(soundToPlay);

    // Hablar la respuesta en voz alta y sincronizar animación (TTS)
    setIsSpeaking(true);
    tabySpeechService.speak(speechText, {
      onStart: () => {
        setIsSpeaking(true);
        setCurrentState('talking');
      },
      onDone: () => {
        setIsSpeaking(false);
        // Si fue una celebración de registro exitoso, mostrar gesto breve y volver a reposo
        if (action.type === 'celebrate' || action.type === 'success' || action.type === 'happy') {
          setCurrentState('celebrate');
          returnTimeoutRef.current = setTimeout(() => {
            setTabyStateStore('idle');
            setCurrentState('idle');
            setDisplayText('En espera... todo tranquilo.');
          }, 1100);
        } else {
          setTabyStateStore('idle');
          setCurrentState('idle');
          setDisplayText('En espera... todo tranquilo.');
        }
      },
      onStopped: () => {
        setIsSpeaking(false);
        setTabyStateStore('idle');
        setCurrentState('idle');
        setDisplayText('En espera... todo tranquilo.');
      },
    });
  }, [tabyTriggerAction, visible]);

  // Reacción al seleccionar una categoría de gasto en la interfaz
  useEffect(() => {
    if (activeCategory) {
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);

      const phrase = `Registrando en ${activeCategory}. ¿Cuánto fue el monto?`;
      setCurrentState('talking');
      setDisplayText(phrase);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setIsSpeaking(true);
      tabySpeechService.speak(phrase, {
        onDone: () => {
          setIsSpeaking(false);
          returnTimeoutRef.current = setTimeout(() => {
            setCurrentState('idle');
            setDisplayText('En espera... todo tranquilo.');
          }, 1500);
        },
        onStopped: () => {
          setIsSpeaking(false);
        },
      });
    }
  }, [activeCategory]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      tabySpeechService.stop();
      if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);
    };
  }, []);

  const handleCloseIsland = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    tabySpeechService.stop();
    setIsSpeaking(false);
    useUIStore.getState().setTabyState('idle');
    useUIStore.getState().setIsTabyListening(false);
    useUIStore.setState({ tabyTriggerAction: null });
    onClose();
  };

  // Gesto de deslizar hacia abajo para cerrar
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 14 && Math.abs(gestureState.dx) < 25;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 35) {
          handleCloseIsland();
        }
      },
    })
  ).current;

  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  // Toque interactivo sobre Taby: Diferencia Coqueto vs. Enojo
  const handleTabyTap = () => {
    if (returnTimeoutRef.current) clearTimeout(returnTimeoutRef.current);

    // Si estaba hablando, un toque detiene la voz inmediatamente
    if (isSpeaking) {
      tabySpeechService.stop();
      setIsSpeaking(false);
      setCurrentState('idle');
      setDisplayText('En espera... todo tranquilo.');
      return;
    }

    const now = Date.now();
    if (now - lastTapTimeRef.current < 1600) {
      tapCountRef.current += 1;
    } else {
      tapCountRef.current = 1;
    }
    lastTapTimeRef.current = now;

    // Rebote elástico en toque
    Animated.sequence([
      Animated.timing(avatarScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 3.5, tension: 180, useNativeDriver: true }),
    ]).start();

    // 1. REACCIÓN DE ENOJO: Si le tocas 3 veces seguidas rápido
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      tabySoundService.play('alarm');

      const angryPhrases = [
        '¡Oye, no me toques tanto! 😤',
        '¡Ya basta de cosquillas, déjame trabajar! 😡',
        '¡Me mareas! Déjame cuidar tus finanzas.',
        '¡Bastaaa! No me molestes tanto. 😠',
      ];
      const phrase = angryPhrases[Math.floor(Math.random() * angryPhrases.length)];

      setCurrentState('talking');
      setDisplayText(phrase);

      setIsSpeaking(true);
      tabySpeechService.speak(phrase, {
        onDone: () => {
          setIsSpeaking(false);
          returnTimeoutRef.current = setTimeout(() => {
            setCurrentState('idle');
            setDisplayText('En espera... todo tranquilo.');
          }, 1500);
        },
        onStopped: () => {
          setIsSpeaking(false);
          setCurrentState('idle');
          setDisplayText('En espera... todo tranquilo.');
        },
      });
      return;
    }

    // 2. REACCIÓN COQUETO / CARIÑOSO: Toque suave
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    tabySoundService.play('twinkle');

    const loveReactions = [
      { text: '¡Jeje, qué lindo! 🥰 Me alegra verte.', speech: 'Jeje, qué lindo. Me alegra verte.' },
      { text: '¡Jeje, me hiciste cosquillas! 😄', speech: 'Jeje, me hiciste cosquillas.' },
      { text: '¡Hoy es un gran día para ahorrar! ✨', speech: 'Hoy es un gran día para ahorrar.' },
      { text: '¡Todo bajo control con tus finanzas! 👍', speech: 'Todo bajo control con tus finanzas.' },
      { text: '¡Aquí estoy para ayudarte siempre! 😊', speech: 'Aquí estoy para ayudarte siempre.' },
    ];
    const picked = loveReactions[Math.floor(Math.random() * loveReactions.length)];

    setCurrentState('talking');
    setDisplayText(picked.text);

    setIsSpeaking(true);
    tabySpeechService.speak(picked.speech, {
      onDone: () => {
        setIsSpeaking(false);
        returnTimeoutRef.current = setTimeout(() => {
          setCurrentState('idle');
          setDisplayText('En espera... todo tranquilo.');
        }, 1200);
      },
      onStopped: () => {
        setIsSpeaking(false);
        setCurrentState('idle');
        setDisplayText('En espera... todo tranquilo.');
      },
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.islandContainer,
        {
          paddingTop: Math.max(insets.top + 2, 38),
          opacity: fadeAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Barra superior de utilidades: Estado, Detener y Cerrar */}
      <View style={styles.topUtilityRow}>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              currentState === 'listening' && styles.statusDotListening,
              currentState === 'thinking' && styles.statusDotThinking,
              currentState === 'talking' && styles.statusDotTalking,
              currentState === 'celebrate' && styles.statusDotCelebrate,
            ]}
          />
          <Text style={styles.statusPillText}>
            {currentState === 'listening'
              ? 'Escuchando...'
              : currentState === 'thinking'
              ? 'Pensando...'
              : currentState === 'talking'
              ? (isSpeaking ? 'Hablando...' : 'Taby')
              : currentState === 'celebrate'
              ? '¡Excelente!'
              : 'Taby AI'}
          </Text>
        </View>

        <View style={styles.topRightActions}>
          {/* Botón Detener Voz */}
          {isSpeaking && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                tabySpeechService.stop();
                setIsSpeaking(false);
                setCurrentState('idle');
                setDisplayText('En espera... todo tranquilo.');
              }}
              style={({ pressed }) => [
                styles.stopBtn,
                pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
              ]}
              hitSlop={8}
            >
              <View style={styles.stopSquare} />
              <Text style={styles.stopBtnText}>Detener</Text>
            </Pressable>
          )}

          {/* Botón Cerrar ("X") */}
          <Pressable
            onPress={handleCloseIsland}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] },
            ]}
            hitSlop={12}
            accessibilityLabel="Cerrar y volver al menú principal naranja"
          >
            <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.6)" />
          </Pressable>
        </View>
      </View>

      {/* CENTRO: TABY VECTORIAL INTERACTIVO EN HTML5 CANVAS (RIVE ORIGINAL) */}
      <View style={styles.avatarCenterContainer}>
        <Pressable onPress={handleTabyTap} hitSlop={10}>
          <Animated.View style={[styles.avatarBox, { transform: [{ scale: avatarScale }] }]}>
            <TabyRiveCanvas
              state={currentState}
              onTap={handleTabyTap}
              style={styles.canvasLayer}
            />
          </Animated.View>
        </Pressable>
      </View>

      {/* ÁREA DE TEXTO: DIÁLOGO DIRECTAMENTE BAJO TABY */}
      <View style={styles.textContainer}>
        <Text style={styles.responseText} numberOfLines={2}>
          {displayText}
        </Text>
      </View>

      {/* Indicador de deslizamiento inferior */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          tabySpeechService.stop();
          setIsSpeaking(false);
          onClose();
        }}
        style={styles.swipeBarWrapper}
        hitSlop={8}
      >
        <View style={styles.swipeBar} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  islandContainer: {
    width: '100%',
    backgroundColor: '#000000',
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    paddingHorizontal: 20,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 14,
  },
  topUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusDotListening: {
    backgroundColor: '#EF4444',
  },
  statusDotThinking: {
    backgroundColor: '#6366F1',
  },
  statusDotTalking: {
    backgroundColor: '#38BDF8',
  },
  statusDotCelebrate: {
    backgroundColor: '#F59E0B',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: -0.2,
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 12,
  },
  stopSquare: {
    width: 6,
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCenterContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  avatarBox: {
    width: 220,
    height: 145,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  canvasLayer: {
    width: 220,
    height: 145,
    backgroundColor: '#000000',
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
    marginTop: 2,
    marginBottom: 6,
  },
  responseText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#E2E8F0',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  swipeBarWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  swipeBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
});
