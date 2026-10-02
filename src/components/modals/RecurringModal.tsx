import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { RecurringPayment, Category } from '@/types';
import {
  RecurringConfigModal,
  RecurringConfigData,
} from '@/components/modals/RecurringConfigModal';

interface RecurringModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenNewTransactionWithRecurring?: (type: 'expense' | 'income') => void;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  visible,
  onClose,
  onOpenNewTransactionWithRecurring,
}) => {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const recurring = useFinanceStore((state) => state.recurring);
  const categories = useFinanceStore((state) => state.categories);
  const updateRecurring = useFinanceStore((state) => state.updateRecurring);
  const deleteRecurring = useFinanceStore((state) => state.deleteRecurring);
  const toggleRecurringStatus = useFinanceStore((state) => state.toggleRecurringStatus);
  const addRecurring = useFinanceStore((state) => state.addRecurring);

  // Tab: Activas vs Inactivas
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Submodals
  const [showNewProgramadaModal, setShowNewProgramadaModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringPayment | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [editAmountStr, setEditAmountStr] = useState('');
  const [showFreqConfigModal, setShowFreqConfigModal] = useState(false);

  // Frequency configuration state for editing
  const [editFreqConfig, setEditFreqConfig] = useState<RecurringConfigData>({
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 30,
    hasEndDate: false,
  });

  // New Programada creation form state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newType, setNewType] = useState<'expense' | 'income'>('expense');
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');

  // Filtered programadas
  const filteredList = useMemo(() => {
    return recurring.filter((r) => {
      const statusMatches = (r.status || 'active') === activeTab;
      if (!statusMatches) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const cat = categories.find((c) => c.id === r.categoryId);
      return (
        r.title.toLowerCase().includes(q) ||
        (cat && cat.name.toLowerCase().includes(q))
      );
    });
  }, [recurring, activeTab, searchQuery, categories]);

  // Category helper
  const getCategory = (catId: string): Category | undefined => {
    return categories.find((c) => c.id === catId);
  };

  // Format frequency label for card display
  const formatFrequencyLabel = (item: RecurringPayment) => {
    switch (item.frequency) {
      case 'daily':
        return item.interval && item.interval > 1
          ? `Cada ${item.interval} días`
          : 'Diario';
      case 'weekly':
        return item.interval && item.interval > 1
          ? `Cada ${item.interval} semanas`
          : 'Semanal';
      case 'biweekly':
        return 'Quincenal';
      case 'monthly':
        return `Mensual el día ${item.dayOfMonth || 30}`;
      case 'yearly':
        return 'Anual';
      default:
        return 'Mensual';
    }
  };

  // Open Edit Sheet
  const handleOpenEdit = (item: RecurringPayment) => {
    setEditingItem(item);
    setEditAmountStr(item.amount.toString());
    setEditFreqConfig({
      frequency: item.frequency || 'monthly',
      interval: item.interval || 1,
      dayOfMonth: item.dayOfMonth || 30,
      hasEndDate: item.hasEndDate || false,
      endDate: item.endDate,
    });
    setShowEditSheet(true);
  };

  // Save changes from Edit Sheet
  const handleSaveEdit = () => {
    if (!editingItem) return;
    const num = parseFloat(editAmountStr) || editingItem.amount;
    updateRecurring(editingItem.id, {
      amount: num,
      frequency: editFreqConfig.frequency,
      interval: editFreqConfig.interval,
      dayOfMonth: editFreqConfig.dayOfMonth,
      hasEndDate: editFreqConfig.hasEndDate,
      endDate: editFreqConfig.endDate,
    });
    setShowEditSheet(false);
    setEditingItem(null);
  };

  // Open creation from Image 3 ("Gasto programado" / "Ingreso programado")
  const handleSelectNewType = (type: 'expense' | 'income') => {
    setShowNewProgramadaModal(false);
    if (onOpenNewTransactionWithRecurring) {
      onClose();
      onOpenNewTransactionWithRecurring(type);
    } else {
      // In-modal creation
      setNewType(type);
      setNewTitle('');
      setNewAmount('');
      const defaultCat = categories.find((c) => c.type === type || c.type === 'both');
      setNewCategoryId(defaultCat?.id || 'food');
      setEditFreqConfig({
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: new Date().getDate(),
        hasEndDate: false,
      });
      setIsCreatingNew(true);
    }
  };

  const handleSaveNewProgramada = () => {
    if (!newTitle.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para la programación.');
      return;
    }
    const num = parseFloat(newAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Monto requerido', 'Por favor introduce un monto válido mayor a 0.');
      return;
    }

    addRecurring({
      title: newTitle.trim(),
      amount: num,
      type: newType,
      frequency: editFreqConfig.frequency,
      interval: editFreqConfig.interval,
      dayOfMonth: editFreqConfig.dayOfMonth,
      nextDueDate: 'Mañana',
      categoryId: newCategoryId || 'food',
      status: 'active',
      hasEndDate: editFreqConfig.hasEndDate,
    });

    setIsCreatingNew(false);
  };

  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20);
  const bottomPadding = Math.max(insets.bottom, 20);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: isDark ? '#0D0E15' : colors.background }]}>
        {/* Cabecera Principal */}
        <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.headerIconBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Programadas</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Pestañas: [🕒 ACTIVAS] [⊗ INACTIVAS] */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: isDark ? '#141824' : colors.backgroundSubtle, borderColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab('active')}
            style={[
              styles.tabPill,
              activeTab === 'active' && {
                backgroundColor: isDark ? '#FFFDF5' : colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              },
            ]}
          >
            <View style={styles.tabContentRow}>
              <Ionicons
                name="time-outline"
                size={16}
                color={activeTab === 'active' ? (isDark ? '#0D0E15' : '#FFFFFF') : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'active'
                    ? { color: isDark ? '#0D0E15' : '#FFFFFF', fontWeight: '800' }
                    : { color: colors.textSecondary },
                ]}
              >
                ACTIVAS
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('inactive')}
            style={[
              styles.tabPill,
              activeTab === 'inactive' && {
                backgroundColor: isDark ? '#FFFDF5' : colors.primary,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 3,
              },
            ]}
          >
            <View style={styles.tabContentRow}>
              <Ionicons
                name="close-circle-outline"
                size={16}
                color={activeTab === 'inactive' ? (isDark ? '#0D0E15' : '#FFFFFF') : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabPillText,
                  activeTab === 'inactive'
                    ? { color: isDark ? '#0D0E15' : '#FFFFFF', fontWeight: '800' }
                    : { color: colors.textSecondary },
                ]}
              >
                INACTIVAS
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Buscador */}
        <View style={styles.searchBarWrapper}>
          <View
            style={[
              styles.searchInputBox,
              { backgroundColor: isDark ? '#141824' : colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar programada..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Banner Informativo (Exacto al de la Imagen 1) */}
        <View style={styles.infoBannerWrapper}>
          <View
            style={[
              styles.infoBannerBox,
              {
                backgroundColor: isDark ? '#0D212E' : 'rgba(6, 182, 212, 0.1)',
                borderColor: isDark ? '#15425B' : 'rgba(6, 182, 212, 0.25)',
              },
            ]}
          >
            <Ionicons name="information-circle" size={18} color="#06B6D4" style={{ marginTop: 1 }} />
            <Text style={[styles.infoBannerText, { color: isDark ? '#A5F3FC' : '#0891B2' }]}>
              Toca una programación para editarla. Los cambios aplican hacia adelante; los registros pasados no cambian.
            </Text>
          </View>
        </View>

        {/* Listado de Programadas */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="repeat-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No hay transacciones {activeTab === 'active' ? 'activas' : 'inactivas'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {activeTab === 'active'
                  ? 'Toca el botón + para programar un gasto o ingreso recurrente.'
                  : 'Las programaciones que desactives aparecerán aquí.'}
              </Text>
            </View>
          ) : (
            filteredList.map((item) => {
              const cat = getCategory(item.categoryId);
              const isIncome = item.type === 'income';
              const catColor = cat?.color || (isIncome ? '#10B981' : '#F59E0B');
              const catIcon = cat?.icon || (isIncome ? 'trending-up' : 'restaurant-outline');
              const isActive = (item.status || 'active') === 'active';

              return (
                <View
                  key={item.id}
                  style={[
                    styles.programadaCard,
                    {
                      backgroundColor: isDark ? '#141824' : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Fila Superior: Icono, Nombre, Categoría y Badge de Estado */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={[styles.catIconBox, { backgroundColor: `${catColor}20` }]}>
                        <Ionicons name={catIcon as any} size={20} color={catColor} />
                      </View>
                      <View>
                        <Text style={[styles.programadaName, { color: colors.text }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.programadaCat, { color: colors.textSecondary }]}>
                          {cat?.name || 'General'}
                        </Text>
                      </View>
                    </View>

                    {/* Badge Activa / Inactiva */}
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isActive
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(107, 114, 128, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isActive ? '#10B981' : '#9CA3AF' },
                        ]}
                      >
                        {isActive ? 'Activa' : 'Inactiva'}
                      </Text>
                    </View>
                  </View>

                  {/* Monto */}
                  <Text
                    style={[
                      styles.amountText,
                      { color: isIncome ? colors.income : colors.text },
                    ]}
                  >
                    {isIncome ? '+' : '-'}
                    {formatCurrency(item.amount, currency, isPrivacyHidden)}
                  </Text>

                  {/* Frecuencia */}
                  <Text style={[styles.freqText, { color: colors.textSecondary }]}>
                    {formatFrequencyLabel(item)}
                  </Text>

                  {/* Próxima Ejecución */}
                  <Text style={[styles.nextDueText, { color: colors.textMuted }]}>
                    Próxima: {item.nextDueDate || 'Pronto'}
                  </Text>

                  {/* Botones de Acción: [✎ Editar] y [⏻ Desactivar / Activar] */}
                  <View style={styles.cardActionRow}>
                    <Pressable
                      onPress={() => handleOpenEdit(item)}
                      style={[
                        styles.cardActionBtn,
                        {
                          backgroundColor: isDark ? '#1C2337' : colors.backgroundSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="pencil-outline" size={15} color={colors.text} />
                      <Text style={[styles.cardActionBtnText, { color: colors.text }]}>
                        Editar
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => toggleRecurringStatus(item.id)}
                      style={[
                        styles.cardActionBtn,
                        {
                          backgroundColor: isDark
                            ? (isActive ? '#2D1D1F' : '#142E25')
                            : (isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'),
                          borderColor: isActive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                        },
                      ]}
                    >
                      <Ionicons
                        name="power-outline"
                        size={15}
                        color={isActive ? '#EF4444' : '#10B981'}
                      />
                      <Text
                        style={[
                          styles.cardActionBtnText,
                          { color: isActive ? '#EF4444' : '#10B981' },
                        ]}
                      >
                        {isActive ? 'Desactivar' : 'Activar'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Botón Flotante + (FAB) */}
        <Pressable
          onPress={() => setShowNewProgramadaModal(true)}
          style={[
            styles.fabBtn,
            {
              backgroundColor: isDark ? '#FFFDF5' : colors.primary,
              bottom: bottomPadding + 16,
            },
          ]}
        >
          <Ionicons name="add" size={28} color={isDark ? '#0D0E15' : '#FFFFFF'} />
        </Pressable>

        {/* =================================================================== */}
        {/* SUBMODAL 1: NUEVA PROGRAMACIÓN (OPCIONES GASTO O INGRESO - Imagen 3) */}
        {/* =================================================================== */}
        {showNewProgramadaModal && (
          <Modal visible={showNewProgramadaModal} transparent animationType="fade">
            <View style={styles.sheetOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowNewProgramadaModal(false)}
              />
              <View
                style={[
                  styles.bottomSheetCard,
                  {
                    backgroundColor: isDark ? '#141824' : colors.card,
                    borderColor: colors.border,
                    paddingBottom: bottomPadding + 20,
                  },
                ]}
              >
                <View style={styles.dragHandle} />
                <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                  Nueva programación
                </Text>

                <View style={styles.newOptionsRow}>
                  {/* Tarjeta Gasto programado */}
                  <Pressable
                    onPress={() => handleSelectNewType('expense')}
                    style={({ pressed }) => [
                      styles.newOptionCard,
                      {
                        backgroundColor: isDark ? '#1A2033' : colors.backgroundSubtle,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={[styles.newOptionIconCircle, { backgroundColor: '#3A1E24' }]}>
                      <Ionicons name="trending-down" size={24} color="#EF4444" />
                      <View style={[styles.recurringSmallDot, { backgroundColor: '#00C076' }]}>
                        <Ionicons name="repeat" size={10} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={[styles.newOptionTitle, { color: colors.text }]}>
                      Gasto programado
                    </Text>
                    <Text style={[styles.newOptionSub, { color: colors.textSecondary }]}>
                      Recurrente
                    </Text>
                  </Pressable>

                  {/* Tarjeta Ingreso programado */}
                  <Pressable
                    onPress={() => handleSelectNewType('income')}
                    style={({ pressed }) => [
                      styles.newOptionCard,
                      {
                        backgroundColor: isDark ? '#1A2033' : colors.backgroundSubtle,
                        borderColor: colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View style={[styles.newOptionIconCircle, { backgroundColor: '#133529' }]}>
                      <Ionicons name="trending-up" size={24} color="#10B981" />
                      <View style={[styles.recurringSmallDot, { backgroundColor: '#00C076' }]}>
                        <Ionicons name="repeat" size={10} color="#FFFFFF" />
                      </View>
                    </View>
                    <Text style={[styles.newOptionTitle, { color: colors.text }]}>
                      Ingreso programado
                    </Text>
                    <Text style={[styles.newOptionSub, { color: colors.textSecondary }]}>
                      Recurrente
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* =================================================================== */}
        {/* SUBMODAL 2: EDITAR PROGRAMACIÓN (Imagen 4)                          */}
        {/* =================================================================== */}
        {showEditSheet && editingItem && (
          <Modal visible={showEditSheet} transparent animationType="slide">
            <View style={styles.sheetOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowEditSheet(false)}
              />
              <View
                style={[
                  styles.bottomSheetCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    paddingBottom: bottomPadding + 20,
                  },
                ]}
              >
                <View style={styles.dragHandle} />

                {/* Header con icono, título y cerrar */}
                <View style={styles.editHeaderRow}>
                  <View style={styles.editHeaderLeft}>
                    <View
                      style={[
                        styles.catIconBox,
                        { backgroundColor: `${getCategory(editingItem.categoryId)?.color || colors.primary}25` },
                      ]}
                    >
                      <Ionicons
                        name={(getCategory(editingItem.categoryId)?.icon as any) || 'restaurant-outline'}
                        size={20}
                        color={getCategory(editingItem.categoryId)?.color || colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={[styles.editItemTitle, { color: colors.text }]}>
                        {editingItem.title}
                      </Text>
                      <Text style={[styles.editItemSubtitle, { color: colors.textSecondary }]}>
                        Editar programación
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => setShowEditSheet(false)}
                    hitSlop={10}
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Campo: Monto */}
                <View style={styles.editFieldSection}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>
                    Monto
                  </Text>
                  <View
                    style={[
                      styles.amountDisplayCard,
                      {
                        backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.amountDisplayCurrency, { color: colors.textSecondary }]}>
                      RD$
                    </Text>
                    <TextInput
                      style={[styles.amountDisplayInput, { color: colors.text }]}
                      value={editAmountStr}
                      onChangeText={setEditAmountStr}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                </View>

                {/* Campo: Frecuencia */}
                <View style={styles.editFieldSection}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>
                    Frecuencia
                  </Text>
                  <Pressable
                    onPress={() => setShowFreqConfigModal(true)}
                    style={[
                      styles.freqSelectCard,
                      {
                        backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.freqSelectLeft}>
                      <Ionicons
                        name="repeat"
                        size={18}
                        color={editingItem.type === 'income' ? colors.income : colors.primary}
                      />
                      <Text style={[styles.freqSelectText, { color: colors.text }]}>
                        {editFreqConfig.frequency === 'monthly'
                          ? `Mensual el día ${editFreqConfig.dayOfMonth}`
                          : editFreqConfig.frequency === 'daily'
                          ? 'Diario'
                          : editFreqConfig.frequency === 'weekly'
                          ? 'Semanal'
                          : editFreqConfig.frequency === 'biweekly'
                          ? 'Quincenal'
                          : 'Anual'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                {/* Nota informativa */}
                <View style={styles.editInfoNotice}>
                  <Ionicons name="information-circle" size={16} color="#06B6D4" />
                  <Text style={[styles.editInfoNoticeText, { color: isDark ? '#A5F3FC' : '#0891B2' }]}>
                    Los cambios aplican desde la próxima fecha. Los registros anteriores no cambian.
                  </Text>
                </View>

                {/* Botón Guardar cambios */}
                <Pressable
                  onPress={handleSaveEdit}
                  style={({ pressed }) => [
                    styles.saveChangesBtn,
                    { backgroundColor: editingItem.type === 'income' ? colors.income : colors.primary },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.saveChangesBtnText}>Guardar cambios</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}

        {/* Modal de Configurar Programación (Frecuencia, días, etc. - Imagen 2) */}
        {showFreqConfigModal && (
          <RecurringConfigModal
            visible={showFreqConfigModal}
            onClose={() => setShowFreqConfigModal(false)}
            onConfirm={(data) => setEditFreqConfig(data)}
            initialConfig={editFreqConfig}
            type={editingItem?.type || 'expense'}
          />
        )}

        {/* Formulario rápido para crear nueva programación si no se usa modal externo */}
        {isCreatingNew && (
          <Modal visible={isCreatingNew} transparent animationType="slide">
            <View style={styles.sheetOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCreatingNew(false)} />
              <View
                style={[
                  styles.bottomSheetCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    paddingBottom: bottomPadding + 20,
                  },
                ]}
              >
                <View style={styles.dragHandle} />
                <View style={styles.editHeaderRow}>
                  <Text style={[styles.editItemTitle, { color: colors.text }]}>
                    Nuevo {newType === 'income' ? 'Ingreso' : 'Gasto'} programado
                  </Text>
                  <Pressable onPress={() => setIsCreatingNew(false)} hitSlop={10}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.editFieldSection}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>
                    Concepto
                  </Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
                    placeholder="Ej: Factura de Teléfono, Netflix, Sueldo..."
                    placeholderTextColor={colors.textMuted}
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />
                </View>

                <View style={styles.editFieldSection}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>
                    Monto (RD$)
                  </Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle, borderColor: colors.border, color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    value={newAmount}
                    onChangeText={setNewAmount}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.editFieldSection}>
                  <Text style={[styles.editFieldLabel, { color: colors.textSecondary }]}>
                    Frecuencia
                  </Text>
                  <Pressable
                    onPress={() => setShowFreqConfigModal(true)}
                    style={[
                      styles.freqSelectCard,
                      {
                        backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.freqSelectLeft}>
                      <Ionicons
                        name="repeat"
                        size={18}
                        color={newType === 'income' ? colors.income : colors.primary}
                      />
                      <Text style={[styles.freqSelectText, { color: colors.text }]}>
                        {editFreqConfig.frequency === 'monthly'
                          ? `Mensual el día ${editFreqConfig.dayOfMonth}`
                          : editFreqConfig.frequency === 'daily'
                          ? 'Diario'
                          : editFreqConfig.frequency === 'weekly'
                          ? 'Semanal'
                          : editFreqConfig.frequency === 'biweekly'
                          ? 'Quincenal'
                          : 'Anual'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={handleSaveNewProgramada}
                  style={({ pressed }) => [
                    styles.saveChangesBtn,
                    { backgroundColor: newType === 'income' ? colors.income : colors.primary },
                    pressed && { opacity: 0.9 },
                  ]}
                >
                  <Text style={styles.saveChangesBtnText}>Programar</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 12,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
    paddingVertical: 0,
  },
  infoBannerWrapper: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  infoBannerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 26,
    lineHeight: 18,
  },
  programadaCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programadaName: {
    fontSize: 16,
    fontWeight: '700',
  },
  programadaCat: {
    fontSize: 12.5,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  freqText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 3,
  },
  nextDueText: {
    fontSize: 12.5,
    marginBottom: 14,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  cardActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fabBtn: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  newOptionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  newOptionCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  newOptionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 6,
  },
  recurringSmallDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#141824',
  },
  newOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  newOptionSub: {
    fontSize: 12,
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  editHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editItemTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  editItemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  editFieldSection: {
    marginBottom: 16,
  },
  editFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  amountDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 8,
  },
  amountDisplayCurrency: {
    fontSize: 17,
    fontWeight: '700',
  },
  amountDisplayInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    paddingVertical: 0,
  },
  freqSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  freqSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  freqSelectText: {
    fontSize: 15,
    fontWeight: '600',
  },
  editInfoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  editInfoNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  saveChangesBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveChangesBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  formInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
});
