import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';

interface BudgetsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const BudgetsModal: React.FC<BudgetsModalProps> = ({ visible, onClose }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const budgets = useFinanceStore((state) => state.budgets);
  const categories = useFinanceStore((state) => state.categories);
  const transactions = useFinanceStore((state) => state.transactions);

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

  if (!modalRendered) return null;

  return (
    <Modal
      visible={modalRendered}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalRoot}>
        {/* Fondo oscurecido fijo con Fade puro */}
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
              <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="pie-chart-outline" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Presupuestos Mensuales</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  Control de límites con alertas al 80%, 90% y 100%
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {budgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId);
              const spent = transactions
                .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
                .reduce((sum, t) => sum + t.amount, 0);

              const percentage = Math.round((spent / b.amount) * 100);
              const remaining = Math.max(0, b.amount - spent);

              // Alertas
              const isOver = percentage >= 100;
              const isHigh = percentage >= 90;
              const isMedium = percentage >= 80;

              const statusColor = isOver ? '#EF4444' : isHigh ? '#F59E0B' : isMedium ? '#FBBF24' : '#10B981';

              return (
                <View
                  key={b.id}
                  style={[
                    styles.budgetCard,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.budgetTopRow}>
                    <View style={styles.catGroup}>
                      <View style={[styles.catIconCircle, { backgroundColor: `${cat?.color || '#3B82F6'}25` }]}>
                        <Ionicons name={(cat?.icon as any) || 'folder-outline'} size={18} color={cat?.color || '#3B82F6'} />
                      </View>
                      <View>
                        <Text style={[styles.catName, { color: colors.text }]}>{cat?.name || 'Categoría'}</Text>
                        <Text style={[styles.catPeriod, { color: colors.textSecondary }]}>Presupuesto Mensual</Text>
                      </View>
                    </View>

                    {isMedium && (
                      <View style={[styles.alertBadge, { backgroundColor: `${statusColor}20` }]}>
                        <Ionicons name="alert-circle" size={12} color={statusColor} />
                        <Text style={[styles.alertText, { color: statusColor }]}>
                          {isOver ? 'Excedido' : isHigh ? '90% Límite' : '80% Límite'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Amounts */}
                  <View style={styles.amountGrid}>
                    <View>
                      <Text style={[styles.colLabel, { color: colors.textSecondary }]}>Presupuesto</Text>
                      <Text style={[styles.colVal, { color: colors.text }]}>
                        {formatCurrency(b.amount, currency, isPrivacyHidden)}
                      </Text>
                    </View>

                    <View>
                      <Text style={[styles.colLabel, { color: colors.textSecondary }]}>Gastado</Text>
                      <Text style={[styles.colVal, { color: statusColor }]}>
                        {formatCurrency(spent, currency, isPrivacyHidden)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.colLabel, { color: colors.textSecondary }]}>Restante</Text>
                      <Text style={[styles.colVal, { color: colors.primary }]}>
                        {formatCurrency(remaining, currency, isPrivacyHidden)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, percentage)}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.percentLabel, { color: colors.textMuted }]}>{percentage}% utilizado</Text>
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
  budgetCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  budgetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
  },
  catPeriod: {
    fontSize: 11,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  alertText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  amountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  colLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  colVal: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'right',
  },
});
