import React, { useState } from 'react';
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
import { useFinanceStore, CommonTemplate } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { formatCurrency } from '@/utils/formatters';
import { Category } from '@/types';
import { CATEGORY_EMOJIS, getCategoryEmoji } from '@/components/modals/NewTransactionModal';

interface CommonTemplatesModalProps {
  visible: boolean;
  onClose: () => void;
}

const POPULAR_EMOJIS = ['🧺', '☕', '🍔', '🛒', '⛽', '🚗', '💊', '💡', '🍿', '🛍️', '💼', '💻', '📈', '🎁', '⚡', '🍕', '🚌', '📱', '🏋️', '📚'];

export const CommonTemplatesModal: React.FC<CommonTemplatesModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode !== 'light';
  const colors = isDark ? ThemeColors.dark : ThemeColors.light;

  const currency = useSettingsStore((state) => state.currency);
  const isPrivacyHidden = useSettingsStore((state) => state.isPrivacyHidden);

  const templates = useFinanceStore((state) => state.commonTemplates);
  const addTemplate = useFinanceStore((state) => state.addCommonTemplate);
  const updateTemplate = useFinanceStore((state) => state.updateCommonTemplate);
  const deleteTemplate = useFinanceStore((state) => state.deleteCommonTemplate);
  const categories = useFinanceStore((state) => state.categories);
  const tags = useFinanceStore((state) => state.tags);
  const addTag = useFinanceStore((state) => state.addTag);

  // Submodal for Creating / Editing Template
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Form States
  const [tmplName, setTmplName] = useState('');
  const [tmplAmount, setTmplAmount] = useState('');
  const [tmplType, setTmplType] = useState<'expense' | 'income'>('expense');
  const [tmplEmoji, setTmplEmoji] = useState('🧺');
  const [tmplCategoryId, setTmplCategoryId] = useState('');
  const [tmplTags, setTmplTags] = useState<string[]>([]);
  const [tmplNotes, setTmplNotes] = useState('');

  // Category Picker inside form
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // New tag input
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);

  // Filter templates by type (Gastos vs Ingresos)
  const expenseTemplates = templates.filter((t) => t.type === 'expense');
  const incomeTemplates = templates.filter((t) => t.type === 'income');

  // Categories filtered by form type
  const availableCategories = categories.filter(
    (c) => c.type === tmplType || c.type === 'both'
  );

  const getCategory = (catId: string): Category | undefined => {
    return categories.find((c) => c.id === catId);
  };

  const handleOpenAdd = () => {
    setEditingTemplateId(null);
    setTmplName('');
    setTmplAmount('');
    setTmplType('expense');
    setTmplEmoji('🧺');
    const defaultCat = categories.find((c) => c.type === 'expense' || c.type === 'both');
    setTmplCategoryId(defaultCat?.id || 'food');
    setTmplTags([]);
    setTmplNotes('');
    setShowFormModal(true);
  };

  const handleOpenEdit = (tmpl: CommonTemplate) => {
    setEditingTemplateId(tmpl.id);
    setTmplName(tmpl.name);
    setTmplAmount(tmpl.amount.toString());
    setTmplType(tmpl.type);
    setTmplEmoji(tmpl.emoji || '⚡');
    setTmplCategoryId(tmpl.categoryId);
    setTmplTags(tmpl.tags || []);
    setTmplNotes(tmpl.notes || '');
    setShowFormModal(true);
  };

  const handleToggleTag = (tag: string) => {
    if (tmplTags.includes(tag)) {
      setTmplTags(tmplTags.filter((t) => t !== tag));
    } else {
      setTmplTags([...tmplTags, tag]);
    }
  };

  const handleAddNewTag = () => {
    if (!newTagInput.trim()) return;
    const formatted = newTagInput.trim().startsWith('#')
      ? newTagInput.trim()
      : `#${newTagInput.trim()}`;
    addTag(formatted);
    setTmplTags([...tmplTags, formatted]);
    setNewTagInput('');
    setShowNewTagInput(false);
  };

  const handleSaveForm = () => {
    const num = parseFloat(tmplAmount.replace(',', '.'));
    if (!tmplName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para el registro común.');
      return;
    }
    if (isNaN(num) || num <= 0) {
      Alert.alert('Monto inválido', 'Por favor ingresa un monto válido mayor a 0.');
      return;
    }
    if (!tmplCategoryId) {
      Alert.alert('Categoría requerida', 'Por favor selecciona una categoría.');
      return;
    }

    if (editingTemplateId) {
      updateTemplate(editingTemplateId, {
        name: tmplName.trim(),
        amount: num,
        type: tmplType,
        emoji: tmplEmoji,
        categoryId: tmplCategoryId,
        tags: tmplTags,
        notes: tmplNotes.trim() || undefined,
      });
    } else {
      addTemplate({
        name: tmplName.trim(),
        amount: num,
        type: tmplType,
        emoji: tmplEmoji,
        categoryId: tmplCategoryId,
        tags: tmplTags,
        notes: tmplNotes.trim() || undefined,
      });
    }

    setShowFormModal(false);
  };

  const handleDeleteCurrent = () => {
    if (!editingTemplateId) return;
    Alert.alert(
      'Eliminar registro común',
      '¿Estás seguro de que deseas eliminar este registro rápido?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteTemplate(editingTemplateId);
            setShowFormModal(false);
          },
        },
      ]
    );
  };

  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20);
  const bottomPadding = Math.max(insets.bottom, 20);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header Principal matching Image 1 */}
        <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text }]}>Registros comunes</Text>

          <View style={{ width: 40 }} />
        </View>

        {/* Listado con secciones GASTOS e INGRESOS */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN: GASTOS */}
          {expenseTemplates.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>GASTOS</Text>
              <View style={styles.cardsGroup}>
                {expenseTemplates.map((t) => {
                  const cat = getCategory(t.categoryId);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => handleOpenEdit(t)}
                      style={({ pressed }) => [
                        styles.templateItemCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      {/* Icono redondeado en cuadrado verde/color (Exacto a Imagen 1) */}
                      <View style={[styles.iconBoxSquare, { backgroundColor: '#0F2F24' }]}>
                        <Text style={{ fontSize: 22 }}>{t.emoji || '🧺'}</Text>
                      </View>

                      {/* Nombre y Categoría */}
                      <View style={styles.templateInfoCol}>
                        <Text style={[styles.templateTitle, { color: colors.text }]} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <Text style={[styles.templateCatSubtitle, { color: colors.textSecondary }]}>
                          {cat?.name || 'General'}
                        </Text>
                      </View>

                      {/* Monto y Chevron */}
                      <View style={styles.amountCol}>
                        <Text style={styles.expenseAmountText}>
                          -{formatCurrency(t.amount, currency, isPrivacyHidden)}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* SECCIÓN: INGRESOS */}
          {incomeTemplates.length > 0 && (
            <View style={styles.sectionContainer}>
              <Text style={[styles.sectionHeading, { color: colors.textMuted }]}>INGRESOS</Text>
              <View style={styles.cardsGroup}>
                {incomeTemplates.map((t) => {
                  const cat = getCategory(t.categoryId);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => handleOpenEdit(t)}
                      style={({ pressed }) => [
                        styles.templateItemCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <View style={[styles.iconBoxSquare, { backgroundColor: '#133529' }]}>
                        <Text style={{ fontSize: 22 }}>{t.emoji || '💼'}</Text>
                      </View>

                      <View style={styles.templateInfoCol}>
                        <Text style={[styles.templateTitle, { color: colors.text }]} numberOfLines={1}>
                          {t.name}
                        </Text>
                        <Text style={[styles.templateCatSubtitle, { color: colors.textSecondary }]}>
                          {cat?.name || 'General'}
                        </Text>
                      </View>

                      <View style={styles.amountCol}>
                        <Text style={styles.incomeAmountText}>
                          +{formatCurrency(t.amount, currency, isPrivacyHidden)}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.35)" />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Estado vacío */}
          {templates.length === 0 && (
            <View style={[styles.emptyContainer, { borderColor: colors.border }]}>
              <Ionicons name="clipboard-outline" size={44} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No tienes registros comunes
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Crea accesos rápidos para tus compras o ingresos habituales (como agua, café, pasaje o pago de nómina) para registrarlos en un toque.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Botón Flotante Circular (+) Exacto a Imagen 1 */}
        <Pressable
          onPress={handleOpenAdd}
          style={({ pressed }) => [
            styles.fabBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>

        {/* =================================================================== */}
        {/* MODAL CREAR / EDITAR REGISTRO COMÚN (User Request #2)                */}
        {/* Nombre, Monto, Emoji, Categoría, Etiquetas y Notas                 */}
        {/* =================================================================== */}
        {showFormModal && (
          <Modal visible={showFormModal} transparent animationType="slide">
            <View style={styles.formModalOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowFormModal(false)}
              />

              <View
                style={[
                  styles.formModalCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    paddingBottom: bottomPadding + 14,
                  },
                ]}
              >
                {/* Drag Handle */}
                <View style={styles.formDragHandle} />

                {/* Header */}
                <View style={styles.formModalHeader}>
                  <Text style={[styles.formModalTitle, { color: colors.text }]}>
                    {editingTemplateId ? 'Editar registro común' : 'Nuevo registro común'}
                  </Text>
                  <Pressable
                    onPress={() => setShowFormModal(false)}
                    hitSlop={10}
                    style={styles.formCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView
                  style={styles.formScroll}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Selector de Tipo (Gasto vs Ingreso) */}
                  <View style={styles.typeSelectorRow}>
                    <Pressable
                      onPress={() => {
                        setTmplType('expense');
                        const defaultCat = categories.find((c) => c.type === 'expense' || c.type === 'both');
                        setTmplCategoryId(defaultCat?.id || 'food');
                      }}
                      style={[
                        styles.typePill,
                        tmplType === 'expense' && styles.typePillActiveExpense,
                      ]}
                    >
                      <Ionicons
                        name="trending-down"
                        size={16}
                        color={tmplType === 'expense' ? '#EF4444' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typePillText,
                          tmplType === 'expense' && { color: '#EF4444', fontWeight: '700' },
                        ]}
                      >
                        Gasto
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setTmplType('income');
                        const defaultCat = categories.find((c) => c.type === 'income' || c.type === 'both');
                        setTmplCategoryId(defaultCat?.id || 'salary');
                      }}
                      style={[
                        styles.typePill,
                        tmplType === 'income' && styles.typePillActiveIncome,
                      ]}
                    >
                      <Ionicons
                        name="trending-up"
                        size={16}
                        color={tmplType === 'income' ? '#10B981' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.typePillText,
                          tmplType === 'income' && { color: '#10B981', fontWeight: '700' },
                        ]}
                      >
                        Ingreso
                      </Text>
                    </Pressable>
                  </View>

                  {/* Nombre */}
                  <View style={styles.formFieldSection}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Nombre del registro
                    </Text>
                    <TextInput
                      value={tmplName}
                      onChangeText={setTmplName}
                      placeholder="Ej. Agua, Café mañanero, Pasaje"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      style={[
                        styles.fieldInput,
                        {
                          backgroundColor: colors.backgroundSubtle,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                  </View>

                  {/* Monto */}
                  <View style={styles.formFieldSection}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Monto</Text>
                    <View
                      style={[
                        styles.amountInputRow,
                        {
                          backgroundColor: colors.backgroundSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.currencyPrefixBadge}>{currency} $</Text>
                      <TextInput
                        value={tmplAmount}
                        onChangeText={setTmplAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        style={[styles.amountInputText, { color: colors.text }]}
                      />
                    </View>
                  </View>

                  {/* Emoji Selector */}
                  <View style={styles.formFieldSection}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Ícono / Emoji: <Text style={{ fontSize: 16 }}>{tmplEmoji}</Text>
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.emojiListRow}
                    >
                      {POPULAR_EMOJIS.map((em) => (
                        <Pressable
                          key={em}
                          onPress={() => setTmplEmoji(em)}
                          style={[
                            styles.emojiBtn,
                            tmplEmoji === em && styles.emojiBtnActive,
                          ]}
                        >
                          <Text style={{ fontSize: 22 }}>{em}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Categoría Selector ("debe dejarme seleccionar la categoria") */}
                  <View style={styles.formFieldSection}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Categoría
                    </Text>
                    <Pressable
                      onPress={() => setShowCategoryPicker(true)}
                      style={[
                        styles.categorySelectBtn,
                        {
                          backgroundColor: colors.backgroundSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.categorySelectLeft}>
                        <Text style={{ fontSize: 20, marginRight: 10 }}>
                          {getCategoryEmoji(tmplCategoryId)}
                        </Text>
                        <Text style={[styles.categorySelectText, { color: colors.text }]}>
                          {getCategory(tmplCategoryId)?.name || 'Seleccionar categoría'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Etiquetas ("y agregar etiquetas") */}
                  <View style={styles.formFieldSection}>
                    <View style={styles.sectionTitleWithAction}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                        Etiquetas
                      </Text>
                      <Pressable
                        onPress={() => setShowNewTagInput(!showNewTagInput)}
                        hitSlop={6}
                      >
                        <Text style={styles.addTagLink}>+ Nueva etiqueta</Text>
                      </Pressable>
                    </View>

                    {showNewTagInput && (
                      <View style={styles.newTagInputRow}>
                        <TextInput
                          value={newTagInput}
                          onChangeText={setNewTagInput}
                          placeholder="#etiqueta"
                          placeholderTextColor="rgba(255, 255, 255, 0.3)"
                          style={[
                            styles.newTagTextInput,
                            {
                              backgroundColor: colors.backgroundSubtle,
                              borderColor: colors.border,
                              color: colors.text,
                            },
                          ]}
                        />
                        <Pressable onPress={handleAddNewTag} style={styles.newTagAddBtn}>
                          <Text style={styles.newTagAddBtnText}>Agregar</Text>
                        </Pressable>
                      </View>
                    )}

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.tagPillsRow}
                    >
                      {tags.map((tag) => {
                        const isSelected = tmplTags.includes(tag);
                        return (
                          <Pressable
                            key={tag}
                            onPress={() => handleToggleTag(tag)}
                            style={[
                              styles.tagChip,
                              isSelected && styles.tagChipActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagChipText,
                                isSelected && styles.tagChipTextActive,
                              ]}
                            >
                              {isSelected ? `✓ ${tag}` : tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Notas ("y notas") */}
                  <View style={styles.formFieldSection}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Notas adicionales
                    </Text>
                    <TextInput
                      value={tmplNotes}
                      onChangeText={setTmplNotes}
                      placeholder="Agrega notas o detalles sobre este registro habitual..."
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      multiline
                      numberOfLines={3}
                      style={[
                        styles.notesTextInput,
                        {
                          backgroundColor: colors.backgroundSubtle,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                    />
                  </View>

                  {/* Botón Guardar */}
                  <Pressable
                    onPress={handleSaveForm}
                    style={({ pressed }) => [
                      styles.saveFormBtn,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.saveFormBtnText}>
                      {editingTemplateId ? 'Guardar cambios' : 'Crear registro común'}
                    </Text>
                  </Pressable>

                  {/* Botón Eliminar si está editando */}
                  {editingTemplateId && (
                    <Pressable
                      onPress={handleDeleteCurrent}
                      style={styles.deleteFormBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      <Text style={styles.deleteFormBtnText}>Eliminar registro común</Text>
                    </Pressable>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Submodal Seleccionar Categoría */}
            {showCategoryPicker && (
              <Modal visible={showCategoryPicker} transparent animationType="fade">
                <View style={styles.formModalOverlay}>
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => setShowCategoryPicker(false)}
                  />
                  <View
                    style={[
                      styles.pickerCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.pickerHeader}>
                      <Text style={[styles.pickerTitle, { color: colors.text }]}>
                        Seleccionar Categoría
                      </Text>
                      <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={8}>
                        <Ionicons name="close" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 350 }}>
                      {availableCategories.map((c) => {
                        const isSelected = tmplCategoryId === c.id;
                        return (
                          <Pressable
                            key={c.id}
                            onPress={() => {
                              setTmplCategoryId(c.id);
                              setShowCategoryPicker(false);
                            }}
                            style={[
                              styles.pickerCategoryRow,
                              isSelected && { backgroundColor: 'rgba(255, 104, 0, 0.18)' },
                            ]}
                          >
                            <Text style={{ fontSize: 22, marginRight: 12 }}>
                              {getCategoryEmoji(c.id)}
                            </Text>
                            <Text
                              style={[
                                styles.pickerCategoryName,
                                { color: isSelected ? colors.primary : colors.text },
                              ]}
                            >
                              {c.name}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark" size={18} color={colors.primary} />
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </View>
              </Modal>
            )}
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
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  cardsGroup: {
    gap: 12,
  },
  templateItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  iconBoxSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  templateInfoCol: {
    flex: 1,
  },
  templateTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    marginBottom: 3,
  },
  templateCatSubtitle: {
    fontSize: 12.5,
  },
  amountCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseAmountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  incomeAmountText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 34,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  fabBtn: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#00C076',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00C076',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  formModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  formModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '90%',
  },
  formDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  formModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formModalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  formCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formScroll: {
    maxHeight: 520,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  typePillActiveExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  typePillActiveIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
  },
  formFieldSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
  },
  currencyPrefixBadge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6800',
    marginRight: 10,
  },
  amountInputText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
  },
  emojiListRow: {
    gap: 8,
    paddingVertical: 4,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnActive: {
    backgroundColor: 'rgba(255, 104, 0, 0.22)',
    borderWidth: 1.5,
    borderColor: '#FF6800',
  },
  categorySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  categorySelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categorySelectText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  sectionTitleWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addTagLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6800',
  },
  newTagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  newTagTextInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  newTagAddBtn: {
    backgroundColor: '#FF6800',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTagAddBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagPillsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tagChipActive: {
    backgroundColor: 'rgba(255, 104, 0, 0.18)',
    borderWidth: 1,
    borderColor: '#FF6800',
  },
  tagChipText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  tagChipTextActive: {
    color: '#FF6800',
    fontWeight: '700',
  },
  notesTextInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13.5,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  saveFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6800',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  saveFormBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 6,
  },
  deleteFormBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#EF4444',
  },
  pickerCard: {
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignSelf: 'center',
    width: '90%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  pickerCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerCategoryName: {
    fontSize: 14.5,
    fontWeight: '600',
    flex: 1,
  },
});
