import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks';
import { Category, CategoryGroup } from '@/types';

type ViewMode =
  | 'categories'
  | 'groups'
  | 'create_group'
  | 'edit_group'
  | 'create_category'
  | 'edit_category';

const COLOR_PALETTE = [
  '#F59E0B', // Amber / Gold
  '#F97316', // Orange
  '#EA580C', // Deep Orange
  '#10B981', // Emerald
  '#059669', // Forest
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#A855F7', // Magenta
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#EF4444', // Red
  '#6B7280', // Slate Gray
];

const AVAILABLE_ICONS = [
  'restaurant-outline',
  'cart-outline',
  'fast-food-outline',
  'cafe-outline',
  'wine-outline',
  'car-outline',
  'bus-outline',
  'airplane-outline',
  'home-outline',
  'bed-outline',
  'sparkles-outline',
  'fitness-outline',
  'medkit-outline',
  'film-outline',
  'game-controller-outline',
  'school-outline',
  'shirt-outline',
  'paw-outline',
  'wallet-outline',
  'cash-outline',
  'card-outline',
  'briefcase-outline',
  'trending-up-outline',
  'gift-outline',
  'repeat-outline',
  'hardware-chip-outline',
  'ellipsis-horizontal-circle-outline',
];

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const categories = useFinanceStore((state) => state.categories);
  const categoryGroups = useFinanceStore((state) => state.categoryGroups) || [];
  const addCategory = useFinanceStore((state) => state.addCategory);
  const updateCategory = useFinanceStore((state) => state.updateCategory);
  const deleteCategory = useFinanceStore((state) => state.deleteCategory);
  const addGroup = useFinanceStore((state) => state.addGroup);
  const updateGroup = useFinanceStore((state) => state.updateGroup);
  const deleteGroup = useFinanceStore((state) => state.deleteGroup);

  // Current Screen / View Mode
  const [viewMode, setViewMode] = useState<ViewMode>('categories');

  // Tab: Gastos vs Ingresos
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Search in categories view
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Group for editing
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'expense' | 'income'>('expense');
  const [groupColor, setGroupColor] = useState('#F59E0B');

  // Selected Category for editing / creation
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState('#F59E0B');
  const [catIcon, setCatIcon] = useState('restaurant-outline');
  const [catGroupId, setCatGroupId] = useState('');
  const [catSubcategories, setCatSubcategories] = useState<string[]>([]);
  const [newSubInput, setNewSubInput] = useState('');
  const [showGroupPickerModal, setShowGroupPickerModal] = useState(false);
  const [showIconPalette, setShowIconPalette] = useState(false);

  // Filtered Groups for current tab
  const relevantGroups = useMemo(() => {
    return categoryGroups.filter((g) => g.type === activeTab);
  }, [categoryGroups, activeTab]);

  // Categories filtered by tab and search
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchType = c.type === activeTab || c.type === 'both';
      if (!matchType) return false;
      if (!searchQuery.trim()) return true;
      return c.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });
  }, [categories, activeTab, searchQuery]);

  // Grouped category structure for display
  const groupedCategoriesList = useMemo(() => {
    const list: { group: CategoryGroup; items: Category[] }[] = [];
    const usedCatIds = new Set<string>();

    relevantGroups.forEach((group) => {
      const items = filteredCategories.filter((c) => c.groupId === group.id);
      items.forEach((c) => usedCatIds.add(c.id));
      if (items.length > 0 || !searchQuery.trim()) {
        list.push({ group, items });
      }
    });

    // Unassigned categories (Sin Grupo)
    const unassigned = filteredCategories.filter((c) => !usedCatIds.has(c.id));
    if (unassigned.length > 0) {
      list.push({
        group: {
          id: 'grp_unassigned',
          name: 'Otros / Sin Grupo',
          type: activeTab,
          color: '#6B7280',
        },
        items: unassigned,
      });
    }

    return list;
  }, [relevantGroups, filteredCategories, searchQuery, activeTab]);

  // Count categories per group
  const getCategoryCountForGroup = (groupId: string) => {
    return categories.filter((c) => c.groupId === groupId).length;
  };

  // Reset and open new category
  const handleOpenNewCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatType(activeTab);
    const defaultGrp = relevantGroups[0]?.id || '';
    setCatGroupId(defaultGrp);
    const grpColor = relevantGroups[0]?.color || '#F59E0B';
    setCatColor(grpColor);
    setCatIcon('folder-outline');
    setCatSubcategories([]);
    setNewSubInput('');
    setViewMode('create_category');
  };

  // Open edit category
  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatType(cat.type === 'income' ? 'income' : 'expense');
    setCatColor(cat.color || '#F59E0B');
    setCatIcon(cat.icon || 'folder-outline');
    setCatGroupId(cat.groupId || '');
    setCatSubcategories([...(cat.subcategories || [])]);
    setNewSubInput('');
    setViewMode('edit_category');
  };

  // Save Category
  const handleSaveCategory = () => {
    if (!catName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para la categoría.');
      return;
    }

    if (viewMode === 'create_category') {
      addCategory({
        name: catName.trim(),
        color: catColor,
        icon: catIcon,
        type: catType,
        groupId: catGroupId || undefined,
        subcategories: catSubcategories,
      });
    } else if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: catName.trim(),
        color: catColor,
        icon: catIcon,
        type: catType,
        groupId: catGroupId || undefined,
        subcategories: catSubcategories,
      });
    }

    setViewMode('categories');
  };

  // Delete Category
  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Estás seguro de que deseas eliminar "${cat.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteCategory(cat.id);
            setViewMode('categories');
          },
        },
      ]
    );
  };

  // Reset and open new group
  const handleOpenNewGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupType(activeTab);
    setGroupColor('#F59E0B');
    setViewMode('create_group');
  };

  // Open edit group
  const handleOpenEditGroup = (grp: CategoryGroup) => {
    setEditingGroup(grp);
    setGroupName(grp.name);
    setGroupType(grp.type);
    setGroupColor(grp.color);
    setViewMode('edit_group');
  };

  // Save Group
  const handleSaveGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para el grupo.');
      return;
    }

    if (viewMode === 'create_group') {
      addGroup({
        name: groupName.trim(),
        type: groupType,
        color: groupColor,
      });
    } else if (editingGroup) {
      updateGroup(editingGroup.id, {
        name: groupName.trim(),
        type: groupType,
        color: groupColor,
      });
    }

    setViewMode('groups');
  };

  // Delete Group
  const handleDeleteGroup = (grp: CategoryGroup) => {
    Alert.alert(
      'Eliminar grupo',
      `¿Deseas eliminar el grupo "${grp.name}"? Las categorías de este grupo no se borrarán, pero quedarán sin grupo asignado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deleteGroup(grp.id);
            setViewMode('groups');
          },
        },
      ]
    );
  };

  // Add subcategory
  const handleAddSubcategory = () => {
    if (!newSubInput.trim()) return;
    if (catSubcategories.includes(newSubInput.trim())) {
      setNewSubInput('');
      return;
    }
    setCatSubcategories([...catSubcategories, newSubInput.trim()]);
    setNewSubInput('');
  };

  const handleRemoveSubcategory = (index: number) => {
    setCatSubcategories(catSubcategories.filter((_, i) => i !== index));
  };

  // Safe area header padding
  const headerPaddingTop = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 20);
  const bottomPadding = Math.max(insets.bottom, 20);

  // Group name for category picker
  const selectedGroupObj = categoryGroups.find((g) => g.id === catGroupId);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* =================================================================== */}
        {/* VISTA 1: CATEGORÍAS (LISTADO AGRUPADO)                              */}
        {/* =================================================================== */}
        {viewMode === 'categories' && (
          <View style={styles.viewWrapper}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
              <Pressable
                onPress={onClose}
                hitSlop={12}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressedState]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>

              <Text style={[styles.headerTitle, { color: colors.text }]}>Categorías</Text>

              <View style={styles.headerRightActions}>
                {/* Botón Grupos (Folder) */}
                <Pressable
                  onPress={() => setViewMode('groups')}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.headerActionCircle,
                    { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                    pressed && styles.pressedState,
                  ]}
                >
                  <Ionicons name="folder-outline" size={20} color={colors.primary} />
                </Pressable>

                {/* Botón Agregar (+) */}
                <Pressable
                  onPress={handleOpenNewCategory}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.headerActionCircle,
                    { backgroundColor: colors.primary },
                    pressed && styles.pressedState,
                  ]}
                >
                  <Ionicons name="add" size={22} color="#0D0C0A" />
                </Pressable>
              </View>
            </View>

            {/* Pestañas Gastos / Ingresos */}
            <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setActiveTab('expense')}
                style={[
                  styles.tabPill,
                  activeTab === 'expense' && [
                    styles.tabPillActive,
                    { backgroundColor: colors.primary },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    activeTab === 'expense'
                      ? { color: '#0D0C0A', fontWeight: '800' }
                      : { color: colors.textSecondary },
                  ]}
                >
                  Gastos
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('income')}
                style={[
                  styles.tabPill,
                  activeTab === 'income' && [
                    styles.tabPillActive,
                    { backgroundColor: colors.primary },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    activeTab === 'income'
                      ? { color: '#0D0C0A', fontWeight: '800' }
                      : { color: colors.textSecondary },
                  ]}
                >
                  Ingresos
                </Text>
              </Pressable>
            </View>

            {/* Barra de Búsqueda */}
            <View style={styles.searchBarWrapper}>
              <View
                style={[
                  styles.searchInputBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Buscar categoría..."
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

            {/* Lista Agrupada de Categorías */}
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 30 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
            >
              {groupedCategoriesList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No se encontraron categorías
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Prueba con otra palabra clave o agrega una nueva categoría.
                  </Text>
                </View>
              ) : (
                groupedCategoriesList.map((section) => (
                  <View key={section.group.id} style={styles.sectionCardWrapper}>
                    {/* Header del Grupo */}
                    <View style={styles.groupHeaderRow}>
                      <View
                        style={[
                          styles.groupColorIndicator,
                          { backgroundColor: section.group.color },
                        ]}
                      />
                      <Text style={[styles.groupHeaderTitle, { color: colors.text }]}>
                        {section.group.name}
                      </Text>
                    </View>

                    {/* Contenedor de Categorías */}
                    <View
                      style={[
                        styles.groupCategoriesCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      {section.items.map((cat, idx) => {
                        const isLast = idx === section.items.length - 1;
                        return (
                          <React.Fragment key={cat.id}>
                            <Pressable
                              onPress={() => handleOpenEditCategory(cat)}
                              style={({ pressed }) => [
                                styles.categoryRow,
                                pressed && styles.rowPressed,
                              ]}
                            >
                              {/* Icono de Categoría */}
                              <View
                                style={[
                                  styles.categoryIconCircle,
                                  { backgroundColor: `${cat.color || colors.primary}22` },
                                ]}
                              >
                                <Ionicons
                                  name={(cat.icon as any) || 'folder-outline'}
                                  size={20}
                                  color={cat.color || colors.primary}
                                />
                              </View>

                              {/* Nombre y Subcategorías */}
                              <View style={styles.categoryInfo}>
                                <Text style={[styles.categoryNameText, { color: colors.text }]}>
                                  {cat.name}{' '}
                                  <Text style={[styles.categoryCountText, { color: colors.textMuted }]}>
                                    ({cat.subcategories?.length || 0})
                                  </Text>
                                </Text>
                              </View>

                              {/* Chevron derecha */}
                              <Ionicons
                                name="chevron-forward"
                                size={18}
                                color={colors.textMuted}
                              />
                            </Pressable>
                            {!isLast && (
                              <View
                                style={[
                                  styles.itemDivider,
                                  { backgroundColor: colors.border },
                                ]}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* =================================================================== */}
        {/* VISTA 2: GRUPOS DE CATEGORÍAS (LISTADO DE GRUPOS)                   */}
        {/* =================================================================== */}
        {viewMode === 'groups' && (
          <View style={styles.viewWrapper}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
              <Pressable
                onPress={() => setViewMode('categories')}
                hitSlop={12}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressedState]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>

              <Text style={[styles.headerTitle, { color: colors.text }]}>Grupos de Categorías</Text>

              <Pressable
                onPress={handleOpenNewGroup}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.headerActionCircle,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressedState,
                ]}
              >
                <Ionicons name="add" size={22} color="#0D0C0A" />
              </Pressable>
            </View>

            {/* Pestañas Gastos / Ingresos */}
            <View style={[styles.tabsContainer, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
              <Pressable
                onPress={() => setActiveTab('expense')}
                style={[
                  styles.tabPill,
                  activeTab === 'expense' && [
                    styles.tabPillActive,
                    { backgroundColor: colors.primary },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    activeTab === 'expense'
                      ? { color: '#0D0C0A', fontWeight: '800' }
                      : { color: colors.textSecondary },
                  ]}
                >
                  Gastos
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('income')}
                style={[
                  styles.tabPill,
                  activeTab === 'income' && [
                    styles.tabPillActive,
                    { backgroundColor: colors.primary },
                  ],
                ]}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    activeTab === 'income'
                      ? { color: '#0D0C0A', fontWeight: '800' }
                      : { color: colors.textSecondary },
                  ]}
                >
                  Ingresos
                </Text>
              </Pressable>
            </View>

            {/* Lista de Grupos */}
            <ScrollView
              style={styles.scrollList}
              contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 30 }]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {relevantGroups.map((group) => {
                const count = getCategoryCountForGroup(group.id);
                return (
                  <Pressable
                    key={group.id}
                    onPress={() => handleOpenEditGroup(group)}
                    style={({ pressed }) => [
                      styles.groupCardItem,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      pressed && styles.rowPressed,
                    ]}
                  >
                    {/* Badge de Color */}
                    <View style={[styles.groupColorBox, { backgroundColor: group.color }]} />

                    {/* Datos del Grupo */}
                    <View style={styles.groupCardInfo}>
                      <Text style={[styles.groupCardName, { color: colors.text }]}>{group.name}</Text>
                      <Text style={[styles.groupCardSub, { color: colors.textSecondary }]}>
                        {count} categoría{count === 1 ? '' : 's'}
                      </Text>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* =================================================================== */}
        {/* VISTA 3: NUEVO GRUPO & EDITAR GRUPO                                 */}
        {/* =================================================================== */}
        {(viewMode === 'create_group' || viewMode === 'edit_group') && (
          <View style={styles.viewWrapper}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
              <Pressable
                onPress={() => setViewMode('groups')}
                hitSlop={12}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressedState]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>

              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {viewMode === 'create_group' ? 'Nuevo Grupo' : 'Editar Grupo'}
              </Text>

              {viewMode === 'edit_group' && editingGroup ? (
                <Pressable
                  onPress={() => handleDeleteGroup(editingGroup)}
                  hitSlop={12}
                  style={styles.headerIconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={[styles.formContent, { paddingBottom: bottomPadding + 80 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
              >
              {/* Color Box Preview */}
              <View style={styles.fieldSection}>
                <View
                  style={[
                    styles.colorPreviewLargeBox,
                    { backgroundColor: groupColor, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.colorPreviewOverlayBadge}>
                    <Ionicons name="color-palette-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.colorPreviewText}>Toca para cambiar color</Text>
                  </View>
                </View>

                {/* Paleta de Colores */}
                <View style={styles.colorSwatchesGrid}>
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = groupColor.toLowerCase() === c.toLowerCase();
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setGroupColor(c)}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          isSelected && styles.colorCircleActive,
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Selector de Tipo (Gasto / Ingreso) */}
              <View style={styles.fieldSection}>
                <View style={[styles.tabRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <Pressable
                    onPress={() => setGroupType('expense')}
                    style={[
                      styles.tabBtn,
                      groupType === 'expense' && { backgroundColor: '#EF4444' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        { color: groupType === 'expense' ? '#FFF' : colors.textSecondary },
                      ]}
                    >
                      Gasto
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setGroupType('income')}
                    style={[
                      styles.tabBtn,
                      groupType === 'income' && { backgroundColor: '#10B981' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        { color: groupType === 'income' ? '#FFF' : colors.textSecondary },
                      ]}
                    >
                      Ingreso
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Nombre del Grupo */}
              <View style={styles.fieldSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Nombre del grupo
                </Text>
                <TextInput
                  style={[
                    styles.formTextInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Ej: Vivienda"
                  placeholderTextColor={colors.textMuted}
                  value={groupName}
                  onChangeText={setGroupName}
                  autoCapitalize="words"
                />
              </View>
            </ScrollView>
            </KeyboardAvoidingView>

            {/* Botón Guardar Inferior */}
            <View style={[styles.footerButtonBox, { paddingBottom: bottomPadding, backgroundColor: colors.background }]}>
              <Pressable
                onPress={handleSaveGroup}
                style={({ pressed }) => [
                  styles.saveFullBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.saveFullBtnText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* =================================================================== */}
        {/* VISTA 4: NUEVA CATEGORÍA & EDITAR CATEGORÍA                         */}
        {/* =================================================================== */}
        {(viewMode === 'create_category' || viewMode === 'edit_category') && (
          <View style={styles.viewWrapper}>
            {/* Header */}
            <View style={[styles.headerBar, { paddingTop: headerPaddingTop }]}>
              <Pressable
                onPress={() => setViewMode('categories')}
                hitSlop={12}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressedState]}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>

              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {viewMode === 'create_category' ? 'Nueva Categoría' : 'Editar Categoría'}
              </Text>

              {viewMode === 'edit_category' && editingCategory ? (
                <Pressable
                  onPress={() => handleDeleteCategory(editingCategory)}
                  hitSlop={12}
                  style={styles.headerIconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </Pressable>
              ) : (
                <View style={{ width: 40 }} />
              )}
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView
                style={styles.formScroll}
                contentContainerStyle={[styles.formContent, { paddingBottom: bottomPadding + 80 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={Keyboard.dismiss}
              >
              {/* Ícono y Color Selector */}
              <View style={styles.catIconSection}>
                <Pressable
                  onPress={() => setShowIconPalette(!showIconPalette)}
                  style={[
                    styles.catIconLargeCircle,
                    { backgroundColor: `${catColor}25`, borderColor: catColor },
                  ]}
                >
                  <Ionicons name={catIcon as any} size={42} color={catColor} />
                </Pressable>
                <Pressable onPress={() => setShowIconPalette(!showIconPalette)}>
                  <Text style={[styles.catIconTapText, { color: colors.primary }]}>
                    {showIconPalette ? 'Ocultar selector de ícono' : 'Toca para cambiar ícono y color'}
                  </Text>
                </Pressable>

                {showIconPalette && (
                  <View
                    style={[
                      styles.iconPaletteContainer,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.paletteSubheading, { color: colors.textSecondary }]}>
                      Selecciona un color:
                    </Text>
                    <View style={styles.colorSwatchesGrid}>
                      {COLOR_PALETTE.map((c) => {
                        const isSelected = catColor.toLowerCase() === c.toLowerCase();
                        return (
                          <Pressable
                            key={c}
                            onPress={() => setCatColor(c)}
                            style={[
                              styles.colorCircleSmall,
                              { backgroundColor: c },
                              isSelected && styles.colorCircleActive,
                            ]}
                          >
                            {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text
                      style={[
                        styles.paletteSubheading,
                        { color: colors.textSecondary, marginTop: 12 },
                      ]}
                    >
                      Selecciona un ícono:
                    </Text>
                    <View style={styles.iconGrid}>
                      {AVAILABLE_ICONS.map((ic) => {
                        const isSelected = catIcon === ic;
                        return (
                          <Pressable
                            key={ic}
                            onPress={() => setCatIcon(ic)}
                            style={[
                              styles.iconGridItem,
                              {
                                backgroundColor: isSelected
                                  ? `${catColor}30`
                                  : colors.backgroundSubtle,
                                borderColor: isSelected ? catColor : 'transparent',
                              },
                            ]}
                          >
                            <Ionicons
                              name={ic as any}
                              size={22}
                              color={isSelected ? catColor : colors.textSecondary}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>

              {/* Selector de Tipo (Gasto / Ingreso) */}
              <View style={styles.fieldSection}>
                <View style={[styles.tabRow, { backgroundColor: colors.backgroundSubtle, borderColor: colors.border }]}>
                  <Pressable
                    onPress={() => setCatType('expense')}
                    style={[
                      styles.tabBtn,
                      catType === 'expense' && { backgroundColor: '#EF4444' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        { color: catType === 'expense' ? '#FFF' : colors.textSecondary },
                      ]}
                    >
                      Gasto
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setCatType('income')}
                    style={[
                      styles.tabBtn,
                      catType === 'income' && { backgroundColor: '#10B981' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBtnText,
                        { color: catType === 'income' ? '#FFF' : colors.textSecondary },
                      ]}
                    >
                      Ingreso
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Nombre de la Categoría */}
              <View style={styles.fieldSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nombre</Text>
                <TextInput
                  style={[
                    styles.formTextInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Ej: Restaurante"
                  placeholderTextColor={colors.textMuted}
                  value={catName}
                  onChangeText={setCatName}
                  autoCapitalize="words"
                />
              </View>

              {/* Selector de Grupo */}
              <View style={styles.fieldSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Grupo</Text>
                <Pressable
                  onPress={() => setShowGroupPickerModal(true)}
                  style={[
                    styles.groupDropdownCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.groupDropdownLeft}>
                    {selectedGroupObj ? (
                      <View
                        style={[
                          styles.groupColorDot,
                          { backgroundColor: selectedGroupObj.color },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.groupColorDot,
                          { backgroundColor: '#6B7280' },
                        ]}
                      />
                    )}
                    <Text style={[styles.groupDropdownText, { color: colors.text }]}>
                      {selectedGroupObj ? selectedGroupObj.name : 'Sin Grupo'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Gestor de Subcategorías */}
              <View style={styles.fieldSection}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Subcategorías ({catSubcategories.length})
                </Text>

                {/* Lista de chips existentes */}
                <View style={styles.subchipsContainer}>
                  {catSubcategories.map((sub, idx) => (
                    <View
                      key={`${sub}-${idx}`}
                      style={[
                        styles.subchip,
                        {
                          backgroundColor: colors.backgroundSubtle,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.subchipText, { color: colors.text }]}>{sub}</Text>
                      <Pressable
                        onPress={() => handleRemoveSubcategory(idx)}
                        hitSlop={6}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>

                {/* Input para agregar subcategoría */}
                <View style={styles.addSubRow}>
                  <TextInput
                    style={[
                      styles.addSubInput,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Agregar subcategoría (ej. Delivery)"
                    placeholderTextColor={colors.textMuted}
                    value={newSubInput}
                    onChangeText={setNewSubInput}
                    onSubmitEditing={handleAddSubcategory}
                  />
                  <Pressable
                    onPress={handleAddSubcategory}
                    style={[styles.addSubBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="add" size={20} color="#0D0C0A" />
                  </Pressable>
                </View>
              </View>
            </ScrollView>
            </KeyboardAvoidingView>

            {/* Botón Guardar Inferior */}
            <View style={[styles.footerButtonBox, { paddingBottom: bottomPadding, backgroundColor: colors.background }]}>
              <Pressable
                onPress={handleSaveCategory}
                style={({ pressed }) => [
                  styles.saveFullBtn,
                  { backgroundColor: colors.primary },
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.saveFullBtnText}>Guardar</Text>
              </Pressable>
            </View>

            {/* Modal para Seleccionar Grupo */}
            {showGroupPickerModal && (
              <Modal visible={showGroupPickerModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                  <View
                    style={[
                      styles.modalSheetCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.modalSheetHeader}>
                      <Text style={[styles.modalSheetTitle, { color: colors.text }]}>
                        Seleccionar Grupo
                      </Text>
                      <Pressable
                        onPress={() => setShowGroupPickerModal(false)}
                        hitSlop={10}
                      >
                        <Ionicons name="close" size={22} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    <ScrollView style={{ maxHeight: 350 }}>
                      {/* Opción Sin Grupo */}
                      <Pressable
                        onPress={() => {
                          setCatGroupId('');
                          setShowGroupPickerModal(false);
                        }}
                        style={[
                          styles.groupPickerRow,
                          { borderColor: colors.border },
                          catGroupId === '' && {
                            backgroundColor: `${colors.primary}20`,
                          },
                        ]}
                      >
                        <View style={[styles.groupColorDot, { backgroundColor: '#6B7280' }]} />
                        <Text style={[styles.groupPickerRowText, { color: colors.text, flex: 1 }]}>
                          Sin Grupo
                        </Text>
                        {catGroupId === '' && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </Pressable>

                      {categoryGroups
                        .filter((g) => g.type === catType)
                        .map((grp) => {
                          const isSelected = catGroupId === grp.id;
                          return (
                            <Pressable
                              key={grp.id}
                              onPress={() => {
                                setCatGroupId(grp.id);
                                setShowGroupPickerModal(false);
                              }}
                              style={[
                                styles.groupPickerRow,
                                { borderColor: colors.border },
                                isSelected && { backgroundColor: `${colors.primary}20` },
                              ]}
                            >
                              <View
                                style={[
                                  styles.groupColorDot,
                                  { backgroundColor: grp.color },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.groupPickerRowText,
                                  { color: colors.text, flex: 1 },
                                ]}
                              >
                                {grp.name}
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark" size={18} color={colors.primary} />
                              )}
                            </Pressable>
                          );
                        })}
                    </ScrollView>

                    {/* Botón "+ Crear nuevo grupo" */}
                    <Pressable
                      onPress={() => {
                        setShowGroupPickerModal(false);
                        handleOpenNewGroup();
                      }}
                      style={[
                        styles.createGroupFromPickerBtn,
                        { backgroundColor: colors.backgroundSubtle, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text
                        style={[
                          styles.createGroupFromPickerText,
                          { color: colors.primary },
                        ]}
                      >
                        Crear nuevo grupo
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  viewWrapper: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressedState: {
    opacity: 0.7,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 18,
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
  tabPillActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchBarWrapper: {
    paddingHorizontal: 18,
    marginBottom: 14,
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
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  sectionCardWrapper: {
    marginBottom: 20,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginLeft: 4,
  },
  groupColorIndicator: {
    width: 4,
    height: 16,
    borderRadius: 2,
  },
  groupHeaderTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupCategoriesCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryNameText: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryCountText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  itemDivider: {
    height: 1,
    marginLeft: 70,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  groupCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  groupColorBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
  },
  groupCardInfo: {
    flex: 1,
  },
  groupCardName: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  groupCardSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  fieldSection: {
    marginBottom: 20,
  },
  colorPreviewLargeBox: {
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  colorPreviewOverlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  colorPreviewText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  colorSwatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.1 }],
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  formTextInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  catIconSection: {
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  catIconLargeCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  catIconTapText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  iconPaletteContainer: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 14,
  },
  paletteSubheading: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  iconGridItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  groupDropdownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
  },
  groupDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  groupColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  groupDropdownText: {
    fontSize: 15,
    fontWeight: '600',
  },
  subchipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  subchip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  subchipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  addSubRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addSubInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  addSubBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtonBox: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveFullBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFullBtnText: {
    color: '#0D0C0A',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheetCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  groupPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 6,
  },
  groupPickerRowText: {
    fontSize: 14.5,
    fontWeight: '600',
  },
  createGroupFromPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  createGroupFromPickerText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
