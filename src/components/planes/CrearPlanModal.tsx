import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';

interface CrearPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectControlExpense: () => void;
  onSelectSaveGoal: () => void;
}

export const CrearPlanModal: React.FC<CrearPlanModalProps> = ({
  visible,
  onClose,
  onSelectControlExpense,
  onSelectSaveGoal,
}) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(249, 115, 22, 0.35)' : '#D1D5DB' },
              ]}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>Crear Plan</Text>

          {/* Options Card */}
          <View
            style={[
              styles.optionsCard,
              {
                backgroundColor: isDark ? colors.backgroundSubtle : '#F8F6F2',
                borderColor: colors.border,
              },
            ]}
          >
            {/* Option 1: Controlar un gasto */}
            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                { opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => {
                onClose();
                onSelectControlExpense();
              }}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: 'rgba(239, 68, 68, 0.16)' },
                ]}
              >
                <Ionicons name="shield-outline" size={22} color="#EF4444" />
              </View>

              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Controlar un gasto
                </Text>
                <Text
                  style={[styles.optionSubtitle, { color: colors.textSecondary }]}
                >
                  Tope máximo para una categoría
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>

            {/* Divider */}
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.06)'
                    : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            />

            {/* Option 2: Ahorrar para una meta */}
            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                { opacity: pressed ? 0.75 : 1 },
              ]}
              onPress={() => {
                onClose();
                onSelectSaveGoal();
              }}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.primaryGlow },
                ]}
              >
                <Ionicons name="disc-outline" size={22} color={colors.primary} />
              </View>

              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Ahorrar para una meta
                </Text>
                <Text
                  style={[styles.optionSubtitle, { color: colors.textSecondary }]}
                >
                  Registra aportes a un objetivo
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    borderRadius: 32,
    borderWidth: 1.5,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  optionsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  optionSubtitle: {
    fontSize: 12.5,
  },
  divider: {
    height: 1,
    marginLeft: 74,
  },
});
