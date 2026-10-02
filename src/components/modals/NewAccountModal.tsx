import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { Account, AccountType, CURRENCIES } from '@/types';

interface NewAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES: { id: AccountType; label: string; icon: string }[] = [
  { id: 'bank', label: 'Cuenta Bancaria', icon: 'business-outline' },
  { id: 'credit_card', label: 'Tarjeta de Crédito', icon: 'card-outline' },
  { id: 'savings', label: 'Cuenta de Ahorro', icon: 'wallet-outline' },
  { id: 'cash', label: 'Efectivo', icon: 'cash-outline' },
  { id: 'wallet', label: 'Billetera Digital', icon: 'globe-outline' },
];

const PRESET_COLORS = [
  '#F59E0B', // Gold
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#6366F1', // Indigo
  '#14B8A6', // Teal
];

export const NewAccountModal: React.FC<NewAccountModalProps> = ({ visible, onClose }) => {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currencyCode = useSettingsStore((state) => state.currency);
  const currencySymbol = CURRENCIES[currencyCode]?.symbol || 'RD$';

  const addAccount = useFinanceStore((state) => state.addAccount);

  const [selectedType, setSelectedType] = useState<AccountType>('bank');
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [billingClosingDay, setBillingClosingDay] = useState('15');
  const [paymentDueDay, setPaymentDueDay] = useState('28');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Por favor ingresa un nombre para la cuenta o tarjeta.');
      return;
    }

    const numBalance = parseFloat(balance.replace(/,/g, '')) || 0;
    const numLimit = parseFloat(creditLimit.replace(/,/g, '')) || 50000;

    const isCredit = selectedType === 'credit_card';

    const newAcc: Omit<Account, 'id'> = {
      name: name.trim(),
      type: selectedType,
      balance: isCredit ? -numBalance : numBalance,
      currency: currencyCode,
      color: selectedColor,
      icon:
        selectedType === 'bank'
          ? 'business-outline'
          : selectedType === 'credit_card'
          ? 'card-outline'
          : selectedType === 'savings'
          ? 'wallet-outline'
          : selectedType === 'cash'
          ? 'cash-outline'
          : 'globe-outline',
      bankName: bankName.trim() || undefined,
      creditLimit: isCredit ? numLimit : undefined,
      balanceUsed: isCredit ? numBalance : undefined,
      billingClosingDay: isCredit ? parseInt(billingClosingDay) || 15 : undefined,
      paymentDueDay: isCredit ? parseInt(paymentDueDay) || 28 : undefined,
    };

    addAccount(newAcc);
    resetAndClose();
  };

  const resetAndClose = () => {
    setName('');
    setBankName('');
    setBalance('');
    setCreditLimit('');
    setSelectedType('bank');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Top handle bar */}
          <View style={styles.topHandle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="add" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Nueva Cuenta o Tarjeta</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Account Type Selector */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TIPO DE CUENTA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {ACCOUNT_TYPES.map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setSelectedType(t.id)}
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: isSelected ? colors.primaryGlow : colors.backgroundSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={16}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.typePillText,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Name Input */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              {selectedType === 'credit_card' ? 'Nombre de la Tarjeta' : 'Nombre de la Cuenta'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
              ]}
              placeholder={
                selectedType === 'credit_card'
                  ? 'Ej: Visa Platinum, Mastercard Gold'
                  : 'Ej: Cuenta Corriente, Billetera personal'
              }
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Bank Name */}
            {selectedType !== 'cash' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Entidad / Banco</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="Ej: Banco Popular, BHD, Banreservas, Chase"
                  placeholderTextColor={colors.textMuted}
                  value={bankName}
                  onChangeText={setBankName}
                />
              </>
            )}

            {/* Credit Card Specific Fields */}
            {selectedType === 'credit_card' ? (
              <>
                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Límite de Crédito</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
                      ]}
                      placeholder="100,000"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={creditLimit}
                      onChangeText={setCreditLimit}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Balance Utilizado</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
                      ]}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={balance}
                      onChangeText={setBalance}
                    />
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Día de Corte</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
                      ]}
                      placeholder="15"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={billingClosingDay}
                      onChangeText={setBillingClosingDay}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Día Límite de Pago</Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
                      ]}
                      placeholder="28"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={paymentDueDay}
                      onChangeText={setPaymentDueDay}
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Standard Account Balance */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Balance Inicial</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={balance}
                  onChangeText={setBalance}
                />
              </>
            )}

            {/* Color Accent Picker */}
            <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 16 }]}>COLOR DISTINTIVO</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map((c) => {
                const isSelected = selectedColor === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[
                      styles.colorPill,
                      { backgroundColor: c },
                      isSelected && styles.colorPillSelected,
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </Pressable>
                );
              })}
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#0D0C0A" />
              <Text style={styles.saveBtnText}>Guardar Cuenta</Text>
            </Pressable>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '90%',
    borderWidth: 1,
  },
  topHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    flexGrow: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  typeScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    marginTop: 6,
  },
  colorPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPillSelected: {
    borderWidth: 2.5,
    borderColor: '#FFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#0D0C0A',
    fontWeight: '800',
    fontSize: 15,
  },
});
