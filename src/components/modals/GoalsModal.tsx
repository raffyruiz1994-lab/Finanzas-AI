import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, TextInput, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

interface GoalsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({ visible, onClose }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const goals = useFinanceStore((state) => state.goals);
  const contributeToGoal = useFinanceStore((state) => state.contributeToGoal);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const [modalRendered, setModalRendered] = useState(visible);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalRendered(true);
      fadeAnim.setValue(0);
      slideAnim.setValue(SCREEN_HEIGHT);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          mass: 0.85,
          stiffness: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (!isClosingRef.current && modalRendered) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalRendered(false);
      });
    }
  }, [visible]);

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setModalRendered(false);
      isClosingRef.current = false;
    });
  };

  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');

  const handleContribute = (goalId: string) => {
    const amt = parseFloat(contributeAmount.replace(/,/g, ''));
    if (!amt || isNaN(amt) || amt <= 0) {
      alert('Introduce un monto válido');
      return;
    }
    contributeToGoal(goalId, amt);
    setContributeGoalId(null);
    setContributeAmount('');
  };

  if (!modalRendered) return null;

  return (
    <Modal
      visible={modalRendered}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Fondo oscurecido con Fade puro */}
        <Animated.View style={[styles.backdropOverlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <View style={styles.sheetContainer} pointerEvents="box-none">
          {/* Tocar fuera cierra el modal */}
          <Pressable style={styles.backdropDismissArea} onPress={handleClose} />

          <Animated.View
            style={[
              styles.content,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="flag-outline" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Metas de Ahorro</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Seguimiento de objetivos y aportes periódicos
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {goals.map((g) => {
              const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

              return (
                <View
                  key={g.id}
                  style={[
                    styles.goalCard,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.goalTopRow}>
                    <View style={styles.goalTitleGroup}>
                      <View style={[styles.goalIconCircle, { backgroundColor: `${g.color}20` }]}>
                        <Ionicons name={g.icon as any} size={20} color={g.color} />
                      </View>
                      <View>
                        <Text style={[styles.goalTitle, { color: colors.text }]}>{g.title}</Text>
                        {g.deadlineDate && (
                          <Text style={[styles.goalDeadline, { color: colors.textSecondary }]}>
                            Meta: {g.deadlineDate}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={[styles.percentBadge, { backgroundColor: `${g.color}20` }]}>
                      <Text style={[styles.percentBadgeText, { color: g.color }]}>{progress}%</Text>
                    </View>
                  </View>

                  {/* Amounts */}
                  <View style={styles.amountsRow}>
                    <View>
                      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Actual ahorrado</Text>
                      <Text style={[styles.metaAmount, { color: colors.primary }]}>
                        {formatCurrency(g.currentAmount, currency, isPrivacyHidden)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>Objetivo</Text>
                      <Text style={[styles.metaAmount, { color: colors.text }]}>
                        {formatCurrency(g.targetAmount, currency, isPrivacyHidden)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progress}%`, backgroundColor: g.color },
                      ]}
                    />
                  </View>

                  {/* Action row */}
                  {contributeGoalId === g.id ? (
                    <View style={styles.contributeInputRow}>
                      <TextInput
                        style={[styles.contributeField, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                        placeholder="Monto a aportar..."
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                        value={contributeAmount}
                        onChangeText={setContributeAmount}
                        autoFocus
                      />
                      <Pressable
                        onPress={() => handleContribute(g.id)}
                        style={[styles.confirmBtn, { backgroundColor: g.color }]}
                      >
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                      </Pressable>
                      <Pressable
                        onPress={() => setContributeGoalId(null)}
                        style={[styles.cancelBtn, { borderColor: colors.border }]}
                      >
                        <Ionicons name="close" size={16} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setContributeGoalId(g.id)}
                      style={[styles.addAporteBtn, { backgroundColor: `${g.color}15`, borderColor: g.color }]}
                    >
                      <Ionicons name="add" size={16} color={g.color} />
                      <Text style={[styles.addAporteText, { color: g.color }]}>Aportar a esta meta</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  </Modal>
);
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  sheetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
    width: '100%',
  },
  content: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    height: '75%',
    padding: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11.5,
  },
  list: {
    flex: 1,
  },
  goalCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  goalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  goalDeadline: {
    fontSize: 11,
    marginTop: 2,
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  addAporteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  addAporteText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  contributeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contributeField: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
