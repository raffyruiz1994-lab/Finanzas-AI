import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Animated,
  Dimensions,
  Switch,
  Keyboard,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ThemeColors } from '@/constants/theme';
import { useAppTheme } from '@/hooks';
import { CURRENCIES, Category } from '@/types';
import { parseNaturalLanguageInput } from '@/services/ai/naturalLanguageParser';
import { RecurringConfigModal, RecurringConfigData } from './RecurringConfigModal';
import { useUIStore } from '@/store/useUIStore';
import { haptic } from '@/utils/haptics';
import { PressableScale } from '@/components/animated';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface NewTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialView?: 'selection' | 'expense' | 'income' | 'ai';
  initialCategoryId?: string;
}

type ModalView = 'selection' | 'expense' | 'income' | 'ai';
type AiSubTab = 'text' | 'voice' | 'ocr';

export const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍔',
  transport: '🚗',
  education: '🎓',
  home: '💡',
  entertainment: '🍿',
  health: '💊',
  shopping: '🛍️',
  savings_goal: '🎯',
  other_expense: '📦',
  salary: '💼',
  business: '💻',
  investments: '📈',
  other_income: '🎁',
};

export const getCategoryEmoji = (id?: string): string => {
  if (!id) return '📁';
  return CATEGORY_EMOJIS[id] || '🏷️';
};

const SAMPLE_RECEIPTS = [
  {
    id: 'rcp_1',
    merchant: 'Supermercado Nacional',
    date: '2026-09-29',
    total: 3458.25,
    tax: 527.50,
    items: ['Leche Entera 1L', 'Pechuga Pollo', 'Frutas y Vegetales'],
    categoryId: 'food',
  },
  {
    id: 'rcp_2',
    merchant: 'Farmacia Carol',
    date: '2026-09-28',
    total: 1240.00,
    tax: 189.15,
    items: ['Medicamentos', 'Vitaminas'],
    categoryId: 'health',
  },
  {
    id: 'rcp_3',
    merchant: 'Estación de Combustible Total',
    date: '2026-09-27',
    total: 2500.00,
    tax: 381.35,
    items: ['Gasolina Premium'],
    categoryId: 'transport',
  },
];

const VOICE_SAMPLES = [
  'Gasté 150 pesos en comida',
  'Gasté 2,500 pesos en supermercado',
  'Recibí 50,000 pesos de salario',
  'Pagué 1,800 pesos de electricidad',
  'Gasté 750 pesos en gasolina',
];

const formatDateFriendly = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return `${dayNames[date.getDay()]}, ${d} de ${monthNames[date.getMonth()]} de ${y}`;
  } catch (e) {
    return dateStr;
  }
};

const formatAmountDisplay = (val: string) => {
  if (!val || val === '0' || val === '') {
    return { integer: '0', decimal: '.00' };
  }
  if (val.includes('.')) {
    const parts = val.split('.');
    const intNum = parseInt(parts[0], 10) || 0;
    const formattedInt = intNum.toLocaleString('en-US');
    return { integer: formattedInt, decimal: `.${parts[1]}` };
  } else {
    const intNum = parseInt(val, 10) || 0;
    const formattedInt = intNum.toLocaleString('en-US');
    return { integer: formattedInt, decimal: '.00' };
  }
};

const formatShortDate = (dateStr: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    if (dateStr === today) return 'Hoy';
    const parts = dateStr.split('-');
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d} ${months[m - 1]}`;
  } catch {
    return dateStr;
  }
};

const KEYPAD_ROWS = [
  [
    { digit: '1', sub: '' },
    { digit: '2', sub: 'ABC' },
    { digit: '3', sub: 'DEF' },
  ],
  [
    { digit: '4', sub: 'GHI' },
    { digit: '5', sub: 'JKL' },
    { digit: '6', sub: 'MNO' },
  ],
  [
    { digit: '7', sub: 'PQRS' },
    { digit: '8', sub: 'TUV' },
    { digit: '9', sub: 'WXYZ' },
  ],
  [
    { digit: '.', isDot: true },
    { digit: '0', sub: '' },
    { digit: 'backspace', isBackspace: true },
  ],
];

interface NumpadKeyProps {
  label?: string;
  sub?: string;
  isBackspace?: boolean;
  isDot?: boolean;
  onPress: () => void;
}

const NumpadKey: React.FC<NumpadKeyProps> = ({
  label,
  sub,
  isBackspace,
  isDot,
  onPress,
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.numpadKey,
      isBackspace && styles.numpadKeyBackspace,
      isDot && styles.numpadKeyDot,
      pressed && styles.numpadKeyPressed,
    ]}
  >
    {isBackspace ? (
      <Ionicons name="backspace-outline" size={23} color="#F87171" />
    ) : isDot ? (
      <Text style={styles.numpadDotText}>•</Text>
    ) : (
      <View style={styles.keyContentBox}>
        <Text style={styles.numpadDigit}>{label}</Text>
        {sub ? <Text style={styles.numpadLetters}>{sub}</Text> : null}
      </View>
    )}
  </Pressable>
);

// =========================================================================
// LUKAS DATE PICKER MODAL (EXACT COMPONENT MATCHING media_1790723108019.png)
// =========================================================================
interface LukasDatePickerModalProps {
  visible: boolean;
  currentDate: string;
  onClose: () => void;
  onConfirm: (dateStr: string) => void;
}

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DAY_SHORT_NAMES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTH_SHORT_NAMES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

const LukasDatePickerModal: React.FC<LukasDatePickerModalProps> = ({
  visible,
  currentDate,
  onClose,
  onConfirm,
}) => {
  const [tempDate, setTempDate] = useState(() => {
    try {
      const [y, m, d] = currentDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    } catch {
      return new Date();
    }
  });

  const [viewYear, setViewYear] = useState(tempDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(tempDate.getMonth());

  useEffect(() => {
    try {
      const [y, m, d] = currentDate.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      setTempDate(dObj);
      setViewYear(dObj.getFullYear());
      setViewMonth(dObj.getMonth());
    } catch {
      const dObj = new Date();
      setTempDate(dObj);
      setViewYear(dObj.getFullYear());
      setViewMonth(dObj.getMonth());
    }
  }, [currentDate, visible]);

  if (!visible) return null;

  const handlePrevDay = () => {
    const next = new Date(tempDate);
    next.setDate(next.getDate() - 1);
    setTempDate(next);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleNextDay = () => {
    const next = new Date(tempDate);
    next.setDate(next.getDate() + 1);
    setTempDate(next);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleQuickSelect = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setTempDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    setTempDate(selected);
  };

  const handleConfirm = () => {
    const y = tempDate.getFullYear();
    const m = String(tempDate.getMonth() + 1).padStart(2, '0');
    const d = String(tempDate.getDate()).padStart(2, '0');
    onConfirm(`${y}-${m}-${d}`);
  };

  // Compare helpers
  const isSameDate = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isTodayActive = isSameDate(tempDate, now);
  const isYesterdayActive = isSameDate(tempDate, yesterday);
  const isTomorrowActive = isSameDate(tempDate, tomorrow);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dateStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={dateStyles.modalCard}>
          <Text style={dateStyles.headerLabel}>Seleccionar fecha</Text>

          {/* Day Navigation Row with arrows */}
          <View style={dateStyles.dayNavRow}>
            <Pressable onPress={handlePrevDay} hitSlop={12} style={dateStyles.chevronBtn}>
              <Ionicons name="chevron-back" size={20} color="rgba(255, 255, 255, 0.75)" />
            </Pressable>

            <Text style={dateStyles.currentDayTitle}>
              {DAY_SHORT_NAMES[tempDate.getDay()]}, {tempDate.getDate()} de {MONTH_SHORT_NAMES[tempDate.getMonth()]}.
            </Text>

            <Pressable onPress={handleNextDay} hitSlop={12} style={dateStyles.chevronBtn}>
              <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.75)" />
            </Pressable>
          </View>

          {/* Quick Selection Pills: Ayer | Hoy | Mañana */}
          <View style={dateStyles.quickPillsRow}>
            <Pressable
              onPress={() => handleQuickSelect(-1)}
              style={[dateStyles.quickPill, isYesterdayActive && dateStyles.quickPillActive]}
            >
              <Text style={[dateStyles.quickPillText, isYesterdayActive && dateStyles.quickPillTextActive]}>
                Ayer
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleQuickSelect(0)}
              style={[dateStyles.quickPill, isTodayActive && dateStyles.quickPillActive]}
            >
              <Text style={[dateStyles.quickPillText, isTodayActive && dateStyles.quickPillTextActive]}>
                Hoy
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleQuickSelect(1)}
              style={[dateStyles.quickPill, isTomorrowActive && dateStyles.quickPillActive]}
            >
              <Text style={[dateStyles.quickPillText, isTomorrowActive && dateStyles.quickPillTextActive]}>
                Mañana
              </Text>
            </Pressable>
          </View>

          {/* Month / Year Bar with dropdown & navigation */}
          <View style={dateStyles.monthBarRow}>
            <View style={dateStyles.monthTitleBox}>
              <Text style={dateStyles.monthTitleText}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
              <Ionicons name="chevron-down" size={14} color="rgba(255, 255, 255, 0.6)" />
            </View>

            <View style={dateStyles.monthArrows}>
              <Pressable onPress={handlePrevMonth} hitSlop={10} style={dateStyles.monthArrowBtn}>
                <Ionicons name="chevron-back" size={16} color="rgba(255, 255, 255, 0.7)" />
              </Pressable>
              <Pressable onPress={handleNextMonth} hitSlop={10} style={dateStyles.monthArrowBtn}>
                <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.7)" />
              </Pressable>
            </View>
          </View>

          {/* Weekday Labels Header: D L M M J V S */}
          <View style={dateStyles.weekdaysHeader}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((w, idx) => (
              <View key={idx} style={dateStyles.weekdayCell}>
                <Text style={dateStyles.weekdayText}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={dateStyles.calendarGrid}>
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <View key={`empty_${idx}`} style={dateStyles.dayCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const isSelected =
                tempDate.getFullYear() === viewYear &&
                tempDate.getMonth() === viewMonth &&
                tempDate.getDate() === day;

              return (
                <Pressable
                  key={`day_${day}`}
                  onPress={() => handleSelectDay(day)}
                  style={dateStyles.dayCell}
                >
                  <View style={[dateStyles.dayCircle, isSelected && dateStyles.dayCircleSelected]}>
                    <Text style={[dateStyles.dayNumberText, isSelected && dateStyles.dayNumberTextSelected]}>
                      {day}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Action Buttons: Cancelar / OK */}
          <View style={dateStyles.actionBtnRow}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={dateStyles.cancelBtnText}>Cancelar</Text>
            </Pressable>

            <Pressable onPress={handleConfirm} hitSlop={10}>
              <Text style={dateStyles.okBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  visible,
  onClose,
  initialView = 'selection',
  initialCategoryId,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  const currencyCode = useSettingsStore((state) => state.currency);
  const currencySymbol = CURRENCIES[currencyCode]?.symbol || 'RD$';

  const categories = useFinanceStore((state) => state.categories);
  const categoryGroups = useFinanceStore((state) => state.categoryGroups);
  const addCategory = useFinanceStore((state) => state.addCategory);
  const tags = useFinanceStore((state) => state.tags);
  const addTag = useFinanceStore((state) => state.addTag);
  const addTransaction = useFinanceStore((state) => state.addTransaction);
  const addRecurring = useFinanceStore((state) => state.addRecurring);
  const goals = useFinanceStore((state) => state.goals);
  const budgets = useFinanceStore((state) => state.budgets);
  const commonTemplates = useFinanceStore((state) => state.commonTemplates);
  const executeCommonTemplate = useFinanceStore((state) => state.executeCommonTemplate);
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);

  const currentBalance = useMemo(() => {
    return transactions.reduce((acc, t) => {
      return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);
  }, [transactions]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const [modalRendered, setModalRendered] = useState(visible);

  // View state: 'selection' (bottom sheet) | 'expense' (full screen) | 'income' (full screen) | 'ai' (full screen)
  const [currentView, setCurrentView] = useState<ModalView>(initialView);

  // Animations for bottom sheet
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const isClosingRef = useRef(false);

  // Blinking cursor for full-screen amount
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const amountInputRef = useRef<TextInput>(null);

  // Form States (for full screen Gasto / Ingreso)
  const [amountStr, setAmountStr] = useState('0');
  const [description, setDescription] = useState('');
  // User asked: "el boton inicial debe decir Elegir categoria en vez de comida y restaurante"
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Teclado oculto por defecto ("debe estar oculto hasta que se vaya a escribir")
  const [showNumpad, setShowNumpad] = useState(false);

  // Etiquetas
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNewTagModal, setShowNewTagModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  // Opciones adicionales (debajo de etiquetas: hacer recurrente, agregar nota, agregar como deuda)
  const [isRecurring, setIsRecurring] = useState(false);
  const [showRecurringConfig, setShowRecurringConfig] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfigData>({
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: new Date().getDate(),
    hasEndDate: false,
  });
  const [hasNote, setHasNote] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [isDebt, setIsDebt] = useState(false);

  // Quick Actions & Tags Modal States (from Luxury Mockup)
  const [isPendingStatus, setIsPendingStatus] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);

  // "Guardar y agregar otro" switch state
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Category Picker & Creator Modals
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🍔');
  const [newCatColor, setNewCatColor] = useState('#F59E0B');

  // Date Picker Modal
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Common Templates Quick Select Modal (Image 2 & 3)
  const [showCommonTemplatesSheet, setShowCommonTemplatesSheet] = useState(false);

  // AI Assistant States
  const [aiSubTab, setAiSubTab] = useState<AiSubTab>('text');
  const [aiText, setAiText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);

  // Voice AI States
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceParsed, setVoiceParsed] = useState<any>(null);

  // OCR Receipt States
  const [selectedReceipt, setSelectedReceipt] = useState(SAMPLE_RECEIPTS[0]);
  const [ocrMerchant, setOcrMerchant] = useState(SAMPLE_RECEIPTS[0].merchant);
  const [ocrTotal, setOcrTotal] = useState(SAMPLE_RECEIPTS[0].total.toString());
  const [ocrDate, setOcrDate] = useState(SAMPLE_RECEIPTS[0].date);
  const [ocrTax, setOcrTax] = useState(SAMPLE_RECEIPTS[0].tax.toString());
  const [ocrCategory, setOcrCategory] = useState(SAMPLE_RECEIPTS[0].categoryId);
  const [isScanning, setIsScanning] = useState(false);

  // Filter categories by type
  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');
  const incomeCategories = categories.filter((c) => c.type === 'income' || c.type === 'both');
  const relevantCategories = currentView === 'income' ? incomeCategories : expenseCategories;
  const selectedCat = categories.find((c) => c.id === selectedCategoryId);

  // Cursor blink effect
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0.1, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  // Modal open / close animations
  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setModalRendered(true);
      if (initialCategoryId) {
        setSelectedCategoryId(initialCategoryId);
        setCurrentView('expense');
        setShowNumpad(true);
      } else {
        setCurrentView(initialView);
      }
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

  // Handle Numpad key input
  const handleNumpadPress = (digit: string) => {
    if (digit === '.') {
      setAmountStr((prev) => {
        if (!prev || prev === '0' || prev === '') return '0.';
        if (prev.includes('.')) return prev;
        return prev + '.';
      });
      return;
    }

    setAmountStr((prev) => {
      if (!prev || prev === '0' || prev === '') return digit;
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1] && parts[1].length >= 2) return prev;
      }
      if (prev.replace('.', '').length >= 9) return prev;
      return prev + digit;
    });
  };

  const handleNumpadBackspace = () => {
    setAmountStr((prev) => {
      if (!prev || prev === '0' || prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  // Open Full-Screen Views
  const handleOpenExpense = () => {
    setSelectedCategoryId('');
    setSelectedSubcategory('');
    setAmountStr('0');
    setDescription('');
    setShowNumpad(false);
    setSelectedTags([]);
    setIsRecurring(false);
    setShowRecurringConfig(false);
    setRecurringConfig({
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: new Date().getDate(),
      hasEndDate: false,
    });
    setHasNote(false);
    setCustomNote('');
    setIsDebt(false);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setCurrentView('expense');
  };

  const handleOpenIncome = () => {
    setSelectedCategoryId('');
    setSelectedSubcategory('');
    setAmountStr('0');
    setDescription('');
    setShowNumpad(false);
    setSelectedTags([]);
    setIsRecurring(false);
    setShowRecurringConfig(false);
    setRecurringConfig({
      frequency: 'monthly',
      interval: 1,
      dayOfMonth: new Date().getDate(),
      hasEndDate: false,
    });
    setHasNote(false);
    setCustomNote('');
    setIsDebt(false);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setCurrentView('income');
  };

  const handleOpenAi = () => {
    setAiText('');
    setParsedPreview(null);
    setCurrentView('ai');
  };

  // Toggle tag
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Create new tag
  const handleAddNewTag = () => {
    if (!newTagInput.trim()) return;
    const formatted = newTagInput.trim().startsWith('#')
      ? newTagInput.trim()
      : `#${newTagInput.trim()}`;
    addTag(formatted);
    setSelectedTags([...selectedTags, formatted]);
    setNewTagInput('');
    setShowNewTagModal(false);
  };

  // Create new category
  const handleCreateNewCategory = () => {
    if (!newCatName.trim()) {
      alert('Introduce un nombre para la categoría');
      return;
    }
    const defaultGroup = categoryGroups?.find(
      (g) => g.type === (currentView === 'income' ? 'income' : 'expense')
    );
    const created = addCategory({
      name: newCatName.trim(),
      color: newCatColor,
      icon: 'folder-outline',
      type: currentView === 'income' ? 'income' : 'expense',
      groupId: defaultGroup?.id,
      subcategories: [],
    });

    CATEGORY_EMOJIS[created.id] = newCatEmoji;
    setSelectedCategoryId(created.id);
    setSelectedSubcategory('');
    setNewCatName('');
    setShowCreateCategoryModal(false);
    setShowCategoryPicker(false);
  };

  // Save manual movement from Full Screen
  const handleSaveExpense = () => {
    const numAmount = parseFloat(amountStr);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      useUIStore.getState().showToast({
        type: 'warning',
        message: 'Por favor, introduce un monto válido',
      });
      return;
    }

    if (!selectedCategoryId) {
      useUIStore.getState().showToast({
        type: 'warning',
        message: 'Por favor, selecciona una categoría para tu gasto',
      });
      return;
    }

    const matchingGoal = goals.find((g) =>
      g.id === selectedCategoryId ||
      (selectedCategoryId === 'savings_goal' && selectedSubcategory && g.title.toLowerCase() === selectedSubcategory.toLowerCase()) ||
      (selectedCategoryId === 'savings_goal' && description && description.toLowerCase().includes(g.title.toLowerCase()))
    );

    const matchingBudget = budgets.find((b) =>
      b.id === selectedCategoryId ||
      b.categoryId === selectedCategoryId ||
      (selectedSubcategory && b.name && b.name.toLowerCase() === selectedSubcategory.toLowerCase()) ||
      (description && b.name && description.toLowerCase().includes(b.name.toLowerCase()))
    );

    addTransaction({
      type: 'expense',
      amount: numAmount,
      currency: currencyCode,
      accountId: accounts[0]?.id || 'acc_cash_main',
      categoryId: selectedCategoryId,
      subcategory: selectedSubcategory || undefined,
      goalId: matchingGoal?.id,
      budgetId: matchingBudget?.id,
      date: selectedDate,
      description: description.trim() || selectedCat?.name || 'Gasto',
      merchant: description.trim() || undefined,
      tags: [
        ...selectedTags,
        ...(isRecurring ? ['#recurrente'] : []),
        ...(isPendingStatus ? ['#pendiente'] : []),
        ...(isDebt ? ['#deuda'] : []),
      ],
      isRecurring: isRecurring,
      notes: customNote.trim() || undefined,
    });

    if (isRecurring) {
      const cycleLabel =
        recurringConfig.frequency === 'daily'
          ? 'Diario'
          : recurringConfig.frequency === 'weekly'
          ? 'Semanal'
          : recurringConfig.frequency === 'biweekly'
          ? 'Quincenal'
          : recurringConfig.frequency === 'yearly'
          ? 'Anual'
          : `Mensual el día ${recurringConfig.dayOfMonth}`;

      addRecurring({
        title: description.trim() || selectedCat?.name || 'Gasto programado',
        amount: numAmount,
        categoryId: selectedCategoryId,
        type: 'expense',
        frequency: recurringConfig.frequency,
        interval: recurringConfig.interval,
        dayOfMonth: recurringConfig.dayOfMonth,
        dayOfWeek: recurringConfig.dayOfWeek,
        hasEndDate: recurringConfig.hasEndDate,
        endDate: recurringConfig.endDate,
        status: 'active',
        nextDueDate: 'Próxima: Mañana',
        accountId: 'acc_cash',
      });
    }

    haptic.success();
    useUIStore.getState().showToast({
      type: 'success',
      title: '¡Gasto Registrado!',
      message: `${currencySymbol} ${numAmount.toLocaleString()} guardado correctamente`,
    });

    if (saveAndAddAnother) {
      setAmountStr('0');
      setDescription('');
      setSelectedCategoryId('');
      setSelectedSubcategory('');
      setSelectedTags([]);
      setCustomNote('');
      setShowNoteInput(false);
      setIsPendingStatus(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } else {
      resetAndClose();
    }
  };

  const handleSaveIncome = () => {
    const numAmount = parseFloat(amountStr);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      useUIStore.getState().showToast({
        type: 'warning',
        message: 'Por favor, introduce un monto válido',
      });
      return;
    }

    if (!selectedCategoryId) {
      useUIStore.getState().showToast({
        type: 'warning',
        message: 'Por favor, selecciona una categoría para tu ingreso',
      });
      return;
    }

    addTransaction({
      type: 'income',
      amount: numAmount,
      currency: currencyCode,
      accountId: accounts[0]?.id || 'acc_cash_main',
      categoryId: selectedCategoryId,
      subcategory: selectedSubcategory || undefined,
      date: selectedDate,
      description: description.trim() || selectedCat?.name || 'Ingreso',
      merchant: description.trim() || undefined,
      tags: [
        ...selectedTags,
        ...(isRecurring ? ['#recurrente'] : []),
        ...(isPendingStatus ? ['#pendiente'] : []),
        ...(isDebt ? ['#deuda'] : []),
      ],
      isRecurring: isRecurring,
      notes: customNote.trim() || undefined,
    });

    if (isRecurring) {
      addRecurring({
        title: description.trim() || selectedCat?.name || 'Ingreso programado',
        amount: numAmount,
        categoryId: selectedCategoryId,
        type: 'income',
        frequency: recurringConfig.frequency,
        interval: recurringConfig.interval,
        dayOfMonth: recurringConfig.dayOfMonth,
        dayOfWeek: recurringConfig.dayOfWeek,
        hasEndDate: recurringConfig.hasEndDate,
        endDate: recurringConfig.endDate,
        status: 'active',
        nextDueDate: 'Próxima: Mañana',
        accountId: 'acc_cash',
      });
    }

    haptic.success();
    useUIStore.getState().showToast({
      type: 'success',
      title: '¡Ingreso Registrado!',
      message: `${currencySymbol} ${numAmount.toLocaleString()} agregado a tu cuenta`,
    });

    if (saveAndAddAnother) {
      setAmountStr('0');
      setDescription('');
      setSelectedCategoryId('');
      setSelectedSubcategory('');
      setSelectedTags([]);
      setCustomNote('');
      setShowNoteInput(false);
      setIsPendingStatus(false);
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
    } else {
      resetAndClose();
    }
  };

  // AI Assistant actions
  const handleParseAiText = () => {
    if (!aiText.trim()) return;
    const parsed = parseNaturalLanguageInput(aiText, categories);
    setParsedPreview(parsed);
  };

  const handleSimulateVoice = (samplePhrase: string) => {
    setIsRecording(true);
    setVoiceTranscript('Escuchando...');
    setVoiceParsed(null);

    setTimeout(() => {
      setVoiceTranscript(samplePhrase);
      const parsed = parseNaturalLanguageInput(samplePhrase, categories);
      setVoiceParsed(parsed);
      setIsRecording(false);
    }, 1100);
  };

  const handleSelectReceipt = (rcp: (typeof SAMPLE_RECEIPTS)[0]) => {
    setSelectedReceipt(rcp);
    setOcrMerchant(rcp.merchant);
    setOcrTotal(rcp.total.toString());
    setOcrDate(rcp.date);
    setOcrTax(rcp.tax.toString());
    setOcrCategory(rcp.categoryId);
  };

  const handleScanReceipt = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 800);
  };

  const handleSaveAi = () => {
    if (aiSubTab === 'text') {
      if (!parsedPreview || !parsedPreview.amount) {
        alert('Escribe una frase válida con monto y concepto.');
        return;
      }
      addTransaction({
        type: parsedPreview.type === 'income' ? 'income' : 'expense',
        amount: parsedPreview.amount,
        currency: currencyCode,
        accountId: accounts[0]?.id || 'acc_cash_main',
        categoryId: parsedPreview.categoryId,
        subcategory: parsedPreview.subcategory,
        date: new Date().toISOString().split('T')[0],
        description: parsedPreview.description || 'Movimiento IA',
        merchant: parsedPreview.merchant,
        tags: ['#ia'],
      });
      resetAndClose();
      return;
    }

    if (aiSubTab === 'voice') {
      if (!voiceParsed || !voiceParsed.amount) {
        alert('Dicta un movimiento antes de guardar.');
        return;
      }
      addTransaction({
        type: voiceParsed.type === 'income' ? 'income' : 'expense',
        amount: voiceParsed.amount,
        currency: currencyCode,
        accountId: accounts[0]?.id || 'acc_cash_main',
        categoryId: voiceParsed.categoryId,
        subcategory: voiceParsed.subcategory,
        date: new Date().toISOString().split('T')[0],
        description: voiceParsed.description || 'Movimiento por Voz',
        merchant: voiceParsed.merchant,
        tags: ['#voz', '#ia'],
      });
      resetAndClose();
      return;
    }

    if (aiSubTab === 'ocr') {
      const numTotal = parseFloat(ocrTotal.replace(/,/g, ''));
      if (!numTotal || isNaN(numTotal)) {
        alert('Monto de recibo inválido.');
        return;
      }
      addTransaction({
        type: 'expense',
        amount: numTotal,
        currency: currencyCode,
        accountId: accounts[0]?.id || 'acc_cash_main',
        categoryId: ocrCategory,
        date: ocrDate,
        description: ocrMerchant.trim() || 'Recibo de compra',
        merchant: ocrMerchant.trim(),
        tags: ['#recibo', '#ocr'],
      });
      resetAndClose();
    }
  };

  // Close and clean up
  const resetAndClose = () => {
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
      setAmountStr('0');
      setDescription('');
      setAiText('');
      setParsedPreview(null);
      setVoiceTranscript('');
      setVoiceParsed(null);
      setIsRecording(false);
      setCurrentView('selection');
      setShowCategoryPicker(false);
      setShowDatePicker(false);
      setShowRecurringConfig(false);
      setShowCommonTemplatesSheet(false);
      setShowNumpad(false);
      setShowNewTagModal(false);
      setShowCreateCategoryModal(false);
      setIsPendingStatus(false);
      setShowNoteInput(false);
      setShowTagsModal(false);
      setSavedToast(false);
      onClose();
      setModalRendered(false);
      isClosingRef.current = false;
    });
  };

  if (!modalRendered) return null;

  // =========================================================================
  // VIEW A: FULL-SCREEN GASTO / INGRESO (MODERNO, INTUITIVO, CON EMOJIS)
  // =========================================================================
  if (currentView === 'expense' || currentView === 'income') {
    const isExpense = currentView === 'expense';
    const accentColor = isExpense ? '#FF6B00' : '#10B981';
    const formattedAmount = formatAmountDisplay(amountStr);

    return (
      <Modal
        visible={modalRendered}
        animationType="slide"
        transparent={false}
        onRequestClose={resetAndClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.fullScreenPaypalWrapper,
            {
              backgroundColor: colors.background,
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 16),
            },
          ]}
        >
          {/* Subtle Ambient Radial Glow */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient
              colors={
                isExpense
                  ? [isDark ? 'rgba(255, 107, 0, 0.16)' : 'rgba(255, 107, 0, 0.08)', 'transparent']
                  : [isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)', 'transparent']
              }
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 0.35 }}
              style={{ width: '100%', height: 260 }}
            />
          </View>

          {/* Toast Notification (when Guardar y agregar otro is active) */}
          {savedToast && (
            <View style={styles.improvedSavedToast} pointerEvents="none">
              <View style={[styles.savedToastCheckCircle, { backgroundColor: isExpense ? '#FF6B00' : '#10B981' }]}>
                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
              </View>
              <Text style={styles.savedToastText}>
                {isExpense ? '¡Gasto guardado! Listo para el siguiente' : '¡Ingreso guardado! Listo para el siguiente'}
              </Text>
            </View>
          )}

          {/* 1. TOP HEADER: Close (X) + Dynamic Island Type Switcher + Date Pill */}
          <View style={styles.paypalHeaderBar}>
            {/* Close Button */}
            <PressableScale
              onPress={resetAndClose}
              style={[styles.paypalCloseBtn, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
              hitSlop={12}
              activeScale={0.92}
              hapticType="light"
              accessibilityLabel="Cerrar modal"
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </PressableScale>

            {/* Dynamic Island Capsule Type Switcher (Gasto | Ingreso) */}
            <View style={[styles.paypalTypeSwitcherPill, { backgroundColor: isDark ? '#141720' : '#E2E8F0' }]}>
              <PressableScale
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setCurrentView('expense');
                  setSelectedCategoryId('');
                  setSelectedSubcategory('');
                }}
                style={[
                  styles.paypalTypeSegment,
                  isExpense && { backgroundColor: '#FF6B00' },
                ]}
                activeScale={0.95}
                hapticType="selection"
              >
                <Text style={[styles.paypalTypeSegmentText, isExpense && styles.paypalTypeSegmentTextActive]}>
                  Gasto
                </Text>
              </PressableScale>

              <PressableScale
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setCurrentView('income');
                  setSelectedCategoryId('');
                  setSelectedSubcategory('');
                }}
                style={[
                  styles.paypalTypeSegment,
                  !isExpense && { backgroundColor: '#10B981' },
                ]}
                activeScale={0.95}
                hapticType="selection"
              >
                <Text style={[styles.paypalTypeSegmentText, !isExpense && styles.paypalTypeSegmentTextActive]}>
                  Ingreso
                </Text>
              </PressableScale>
            </View>

            {/* Date Pill Capsule */}
            <PressableScale
              onPress={() => setShowDatePicker(true)}
              style={[styles.paypalDatePill, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]}
              hitSlop={8}
              activeScale={0.92}
              hapticType="selection"
            >
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.paypalDatePillText, { color: colors.text }]}>
                {formatShortDate(selectedDate)}
              </Text>
              <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
            </PressableScale>
          </View>

          {/* 2. BODY SCROLLABLE */}
          <ScrollView
            style={styles.paypalScroll}
            contentContainerStyle={styles.paypalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* HERO AMOUNT DISPLAY (Centered, Huge Typography with Native Keyboard TextInput) */}
            <Pressable
              onPress={() => amountInputRef.current?.focus()}
              style={styles.paypalHeroAmountSection}
            >
              <View style={styles.paypalAmountRow}>
                <Text style={[styles.paypalCurrencySymbol, { color: accentColor }]}>
                  {currencySymbol}
                </Text>
                <TextInput
                  ref={amountInputRef}
                  style={[
                    styles.nativeHeroAmountInput,
                    {
                      color: colors.text,
                      fontSize: amountStr.length > 7 ? 36 : 48,
                    },
                  ]}
                  value={amountStr === '0' ? '' : amountStr}
                  onChangeText={(text) => {
                    const normalized = text.replace(/,/g, '.');
                    const filtered = normalized.replace(/[^0-9.]/g, '');
                    const parts = filtered.split('.');
                    if (parts.length > 2) return;
                    if (parts[1] && parts[1].length > 2) return;
                    if (filtered.replace('.', '').length > 9) return;
                    setAmountStr(filtered === '' ? '0' : filtered);
                  }}
                  placeholder="0"
                  placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)'}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus={true}
                  selectTextOnFocus
                />
              </View>

              {/* Subtitle Balance Underneath */}
              <Text style={[styles.paypalBalanceSubtext, { color: colors.textSecondary }]}>
                Disponible: {currencySymbol}{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </Pressable>

            {/* NOTE / DESCRIPTION INPUT (Concepto) */}
            <View
              style={[
                styles.paypalNoteBox,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
            >
              <Ionicons name="create-outline" size={17} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.paypalNoteInput, { color: colors.text }]}
                value={description}
                onChangeText={setDescription}
                placeholder={isExpense ? '¿En qué gastaste? (Nota o concepto)' : '¿Concepto del ingreso?'}
                placeholderTextColor={colors.textMuted}
                maxLength={60}
              />
              {description.length > 0 && (
                <Pressable onPress={() => setDescription('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* CATEGORÍA (AHORA ABAJO DEL MONTO Y CONCEPTO) */}
            <PressableScale
              onPress={() => {
                Keyboard.dismiss();
                setShowCategoryPicker(true);
              }}
              style={[
                styles.paypalContextCard,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
                },
              ]}
              activeScale={0.98}
              hapticType="selection"
            >
              <View style={[styles.paypalContextAvatarBox, { backgroundColor: isDark ? '#1C202C' : '#E2E8F0' }]}>
                <Text style={styles.paypalContextEmoji}>
                  {selectedCat ? getCategoryEmoji(selectedCat.id) : (isExpense ? '🍔' : '💰')}
                </Text>
              </View>

              <View style={styles.paypalContextTextCol}>
                <Text style={[styles.paypalContextName, { color: colors.text }]} numberOfLines={1}>
                  {selectedCat ? selectedCat.name : 'Elegir Categoría'}
                </Text>
                <Text style={[styles.paypalContextSub, { color: colors.textSecondary }]} numberOfLines={1}>
                  {selectedSubcategory ? selectedSubcategory : (isExpense ? '¿En qué rubro entra?' : 'Origen del fondo')}
                </Text>
              </View>

              <View style={styles.paypalContextChangeBtn}>
                <Text style={[styles.paypalContextChangeText, { color: accentColor }]}>Cambiar</Text>
                <Ionicons name="chevron-forward" size={13} color={accentColor} />
              </View>
            </PressableScale>

            {/* SWIFTUI CAPSULE PILLS (Etiquetas, Estado, Recurrente, Nota Extra) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.paypalPillsScrollContent}
              style={styles.paypalPillsScroll}
            >
              {/* 1. Etiquetas */}
              <PressableScale
                onPress={() => {
                  Keyboard.dismiss();
                  setShowTagsModal(true);
                }}
                style={[
                  styles.paypalSwiftChip,
                  selectedTags.length > 0 && {
                    backgroundColor: isDark ? 'rgba(255, 107, 0, 0.15)' : 'rgba(255, 107, 0, 0.10)',
                    borderColor: accentColor,
                  },
                  {
                    backgroundColor: selectedTags.length > 0 ? undefined : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                    borderColor: selectedTags.length > 0 ? accentColor : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                  },
                ]}
                activeScale={0.94}
                hapticType="selection"
              >
                <Ionicons name="pricetags-outline" size={13} color={selectedTags.length > 0 ? accentColor : colors.textSecondary} />
                <Text
                  style={[
                    styles.paypalSwiftChipText,
                    { color: selectedTags.length > 0 ? accentColor : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {selectedTags.length > 0 ? selectedTags.join(', ') : 'Etiquetas'}
                </Text>
                <Ionicons name="chevron-forward" size={11} color={selectedTags.length > 0 ? accentColor : colors.textMuted} />
              </PressableScale>

              {/* 2. Recurrente */}
              <PressableScale
                onPress={() => {
                  Keyboard.dismiss();
                  setShowRecurringConfig(true);
                }}
                style={[
                  styles.paypalSwiftChip,
                  isRecurring && {
                    backgroundColor: isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(168, 85, 247, 0.10)',
                    borderColor: '#A855F7',
                  },
                  {
                    backgroundColor: isRecurring ? 'rgba(168, 85, 247, 0.18)' : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                    borderColor: isRecurring ? '#A855F7' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                  },
                ]}
                activeScale={0.94}
                hapticType="selection"
              >
                <Ionicons name="repeat" size={13} color={isRecurring ? '#A855F7' : colors.textSecondary} />
                <Text
                  style={[
                    styles.paypalSwiftChipText,
                    { color: isRecurring ? '#A855F7' : colors.textSecondary },
                  ]}
                >
                  {isRecurring ? 'Recurrente ✓' : 'Programar'}
                </Text>
              </PressableScale>

              {/* 4. Nota Extra */}
              <PressableScale
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setShowNoteInput(!showNoteInput);
                }}
                style={[
                  styles.paypalSwiftChip,
                  (showNoteInput || customNote.length > 0) && {
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.10)',
                    borderColor: '#3B82F6',
                  },
                  {
                    backgroundColor: (showNoteInput || customNote.length > 0) ? 'rgba(59, 130, 246, 0.18)' : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                    borderColor: (showNoteInput || customNote.length > 0) ? '#3B82F6' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
                  },
                ]}
                activeScale={0.94}
                hapticType="selection"
              >
                <Ionicons name="document-text-outline" size={13} color={(showNoteInput || customNote.length > 0) ? '#3B82F6' : colors.textSecondary} />
                <Text
                  style={[
                    styles.paypalSwiftChipText,
                    { color: (showNoteInput || customNote.length > 0) ? '#3B82F6' : colors.textSecondary },
                  ]}
                >
                  {customNote.length > 0 ? 'Nota ✓' : '+ Detalle'}
                </Text>
              </PressableScale>
            </ScrollView>

            {/* Expandable Extra Note Box */}
            {showNoteInput && (
              <View
                style={[
                  styles.paypalInlineNoteCard,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  },
                ]}
              >
                <TextInput
                  style={[styles.paypalInlineNoteInput, { color: colors.text }]}
                  value={customNote}
                  onChangeText={setCustomNote}
                  maxLength={120}
                  multiline
                  numberOfLines={2}
                  placeholder="Detalles o notas adicionales..."
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={[styles.paypalInlineCharCount, { color: colors.textMuted }]}>
                  {customNote.length}/120
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 3. BOTTOM ACTION: Toggle + Send Button */}
          <View
            style={[
              styles.paypalBottomBar,
              {
                paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 36 : 24) + 12,
              },
            ]}
          >
            {/* Guardar y agregar otro toggle */}
            <View style={styles.paypalToggleRow}>
              <Text style={[styles.paypalToggleLabel, { color: colors.textSecondary }]}>
                Guardar y agregar otro
              </Text>
              <Switch
                value={saveAndAddAnother}
                onValueChange={setSaveAndAddAnother}
                trackColor={{ false: isDark ? '#222530' : '#E2E8F0', true: isExpense ? '#FF6B00' : '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {/* CTA Button */}
            <PressableScale
              onPress={isExpense ? handleSaveExpense : handleSaveIncome}
              style={styles.paypalSubmitBtnWrapper}
              activeScale={0.96}
              scaleTo={0.96}
              hapticType="medium"
            >
              <LinearGradient
                colors={isExpense ? ['#FF6B00', '#FF8500'] : ['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.paypalSubmitBtnGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.paypalSubmitBtnText}>
                  {isExpense ? 'Guardar Gasto' : 'Guardar Ingreso'}
                </Text>
              </LinearGradient>
            </PressableScale>
          </View>
        </KeyboardAvoidingView>

      {/* Lukas Date Picker Modal */}
          <LukasDatePickerModal
            visible={showDatePicker}
            currentDate={selectedDate}
            onClose={() => setShowDatePicker(false)}
            onConfirm={(newDate) => {
              setSelectedDate(newDate);
              setShowDatePicker(false);
            }}
          />

          {/* Recurring Config Modal */}
          <RecurringConfigModal
            visible={showRecurringConfig}
            type={currentView === 'income' ? 'income' : 'expense'}
            initialConfig={recurringConfig}
            onClose={() => setShowRecurringConfig(false)}
            onConfirm={(cfg) => {
              setRecurringConfig(cfg);
              setIsRecurring(true);
              setShowRecurringConfig(false);
            }}
          />

          {/* Category Picker Modal (Con botón + Crear nueva categoría - User Request #4) */}
          {showCategoryPicker && (
            <Modal visible={showCategoryPicker} animationType="slide" transparent>
              <View style={[styles.catModalBackdrop, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.5)' }]}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setShowCategoryPicker(false)}
                />
                <View
                  style={[
                    styles.catModalCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      marginBottom: Math.max(insets.bottom, 14) + 10,
                    },
                  ]}
                >
                  <View style={styles.catModalHeader}>
                    <Text style={[styles.catModalTitle, { color: colors.text }]}>Seleccionar Categoría</Text>
                    <Pressable onPress={() => setShowCategoryPicker(false)} hitSlop={10}>
                      <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Botón "+ Crear nueva categoría" */}
                  <Pressable
                    onPress={() => setShowCreateCategoryModal(true)}
                    style={[
                      styles.createCatBtn,
                      {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                    <Text style={[styles.createCatBtnText, { color: '#FFFFFF' }]}>Crear nueva categoría</Text>
                  </Pressable>

                  <ScrollView style={styles.catModalList} showsVerticalScrollIndicator={false}>
                    {relevantCategories.map((c) => {
                      const isSelected = c.id === selectedCategoryId;
                      return (
                        <View key={c.id} style={styles.catModalItemWrapper}>
                          <Pressable
                            onPress={() => {
                              setSelectedCategoryId(c.id);
                              setSelectedSubcategory('');
                              setShowCategoryPicker(false);
                            }}
                            style={[
                              styles.catModalItem,
                              {
                                backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                                borderColor: isSelected ? colors.primary : colors.border,
                              },
                              isSelected && {
                                backgroundColor: isDark ? 'rgba(255, 104, 0, 0.14)' : 'rgba(255, 104, 0, 0.08)',
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <View style={styles.catModalItemLeft}>
                              <Text style={styles.catModalItemEmoji}>{getCategoryEmoji(c.id)}</Text>
                              <View>
                                <Text style={[styles.catModalItemName, { color: colors.text }]}>{c.name}</Text>
                                <Text
                                  style={[
                                    styles.catModalItemCount,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {c.subcategories.length > 0
                                    ? `${c.subcategories.length} subcategorías`
                                    : 'Sin subcategorías'}
                                </Text>
                              </View>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark" size={20} color={colors.primary} />
                            )}
                          </Pressable>

                          {/* Subcategories list */}
                          {isSelected && (() => {
                            let subList = c.subcategories || [];
                            if (c.id === 'savings_goal') {
                              const goalTitles = goals.map((g) => g.title);
                              subList = Array.from(new Set([...subList, ...goalTitles]));
                            } else {
                              const budgetNames = budgets
                                .filter((b) => (b.categoryId === c.id || b.id === c.id) && b.name)
                                .map((b) => b.name as string);
                              if (budgetNames.length > 0) {
                                subList = Array.from(new Set([...subList, ...budgetNames]));
                              }
                            }
                            if (subList.length === 0) return null;
                            return (
                              <View style={styles.subcatsContainer}>
                                {subList.map((sub) => {
                                  const isSubSelected = selectedSubcategory === sub;
                                  return (
                                    <Pressable
                                      key={sub}
                                      onPress={() => {
                                        setSelectedSubcategory(sub);
                                        setShowCategoryPicker(false);
                                      }}
                                      style={[
                                        styles.subcatPill,
                                        {
                                          backgroundColor: isDark ? '#232938' : '#F1F5F9',
                                          borderColor: colors.border,
                                        },
                                        isSubSelected && {
                                          backgroundColor: colors.primary,
                                          borderColor: colors.primary,
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.subcatPillText,
                                          { color: isDark ? colors.text : colors.textSecondary },
                                          isSubSelected && { color: '#FFFFFF', fontWeight: '700' },
                                        ]}
                                      >
                                        {sub}
                                      </Text>
                                    </Pressable>
                                  );
                                })}
                              </View>
                            );
                          })()}
                        </View>
                      );
                    })}
                    <View style={{ height: 30 }} />
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

          {/* Modal para Crear Nueva Categoría */}
          {showCreateCategoryModal && (
            <Modal visible={showCreateCategoryModal} animationType="fade" transparent>
              <View style={[styles.promptBackdrop, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.5)' }]}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setShowCreateCategoryModal(false)}
                />
                <View style={[styles.promptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.promptTitle, { color: colors.text }]}>Nueva Categoría</Text>
                  <Text style={[styles.promptSub, { color: colors.textSecondary }]}>
                    Crea una categoría personalizada para tus finanzas
                  </Text>

                  {/* Nombre Input */}
                  <TextInput
                    value={newCatName}
                    onChangeText={setNewCatName}
                    placeholder="Ej: Mascotas, Gimnasio, Cursos..."
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.promptInput,
                      {
                        backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    autoFocus
                  />

                  {/* Selector de Emoji */}
                  <Text style={[styles.promptFieldLabel, { color: colors.textSecondary }]}>Elige un Emoji:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.emojiPickerRow}
                  >
                    {[
                      '🐶', '🐱', '🏋️', '🎮', '✈️', '🍕', '☕', '💻',
                      '🎨', '🎵', '🌱', '🚗', '📚', '👶', '🏥', '🛠️',
                    ].map((em) => (
                      <Pressable
                        key={em}
                        onPress={() => setNewCatEmoji(em)}
                        style={[
                          styles.emojiChoiceBtn,
                          {
                            backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                            borderColor: colors.border,
                          },
                          newCatEmoji === em && {
                            borderColor: colors.primary,
                            backgroundColor: isDark ? 'rgba(255, 104, 0, 0.22)' : 'rgba(255, 104, 0, 0.12)',
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 22 }}>{em}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {/* Selector de Color */}
                  <Text style={[styles.promptFieldLabel, { color: colors.textSecondary }]}>Color:</Text>
                  <View style={styles.colorPickerRow}>
                    {[
                      '#FF6800', '#10B981', '#3B82F6', '#EC4899',
                      '#8B5CF6', '#EF4444', '#14B8A6', '#F59E0B',
                    ].map((col) => (
                      <Pressable
                        key={col}
                        onPress={() => setNewCatColor(col)}
                        style={[
                          styles.colorChoiceCircle,
                          { backgroundColor: col },
                          newCatColor === col && [
                            styles.colorChoiceCircleActive,
                            { borderColor: isDark ? '#FFFFFF' : '#0F172A' },
                          ],
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.promptBtnRow}>
                    <Pressable
                      onPress={() => setShowCreateCategoryModal(false)}
                      style={[
                        styles.promptCancelBtn,
                        { backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle },
                      ]}
                    >
                      <Text style={[styles.promptCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleCreateNewCategory}
                      style={[styles.promptConfirmBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.promptConfirmText, { color: '#FFFFFF' }]}>Guardar Categoría</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Modal para Crear Nueva Etiqueta */}
          {showNewTagModal && (
            <Modal visible={showNewTagModal} animationType="fade" transparent>
              <View style={[styles.promptBackdrop, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.5)' }]}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setShowNewTagModal(false)}
                />
                <View style={[styles.promptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.promptTitle, { color: colors.text }]}>Nueva Etiqueta</Text>
                  <Text style={[styles.promptSub, { color: colors.textSecondary }]}>
                    Escribe el nombre de la etiqueta para categorizar mejor tus movimientos
                  </Text>

                  <TextInput
                    value={newTagInput}
                    onChangeText={setNewTagInput}
                    placeholder="Ej: vacaciones, salud, familia..."
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.promptInput,
                      {
                        backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    autoFocus
                  />

                  <View style={styles.promptBtnRow}>
                    <Pressable
                      onPress={() => setShowNewTagModal(false)}
                      style={[
                        styles.promptCancelBtn,
                        { backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle },
                      ]}
                    >
                      <Text style={[styles.promptCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
                    </Pressable>

                    <Pressable
                      onPress={handleAddNewTag}
                      style={[styles.promptConfirmBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.promptConfirmText, { color: '#FFFFFF' }]}>Agregar Etiqueta</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Modal para Seleccionar Etiquetas */}
          {showTagsModal && (
            <Modal
              visible={showTagsModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowTagsModal(false)}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[
                  styles.tagsModalBackdrop,
                  { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(15, 23, 42, 0.5)' },
                ]}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowTagsModal(false);
                  }}
                />
                <View
                  style={[
                    styles.tagsModalCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      marginBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 14) + 10,
                    },
                  ]}
                >
                  <View style={styles.tagsModalHeader}>
                    <Text style={[styles.tagsModalTitle, { color: colors.text }]}>Seleccionar Etiquetas</Text>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowTagsModal(false);
                      }}
                      hitSlop={10}
                    >
                      <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {/* Input para agregar nueva etiqueta */}
                  <View style={styles.newTagInputRow}>
                    <TextInput
                      value={newTagInput}
                      onChangeText={setNewTagInput}
                      placeholder="#nueva_etiqueta"
                      placeholderTextColor={colors.textMuted}
                      style={[
                        styles.newTagTextInput,
                        {
                          backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                          borderColor: colors.border,
                          color: colors.text,
                        },
                      ]}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        if (!newTagInput.trim()) return;
                        const formatted = newTagInput.trim().startsWith('#')
                          ? newTagInput.trim()
                          : `#${newTagInput.trim()}`;
                        addTag(formatted);
                        if (!selectedTags.includes(formatted)) {
                          setSelectedTags([...selectedTags, formatted]);
                        }
                        setNewTagInput('');
                      }}
                    />
                    <Pressable
                      onPress={() => {
                        if (!newTagInput.trim()) return;
                        const formatted = newTagInput.trim().startsWith('#')
                          ? newTagInput.trim()
                          : `#${newTagInput.trim()}`;
                        addTag(formatted);
                        if (!selectedTags.includes(formatted)) {
                          setSelectedTags([...selectedTags, formatted]);
                        }
                        setNewTagInput('');
                      }}
                      style={[styles.newTagAddSubmitBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.newTagAddSubmitText, { color: '#FFFFFF' }]}>Agregar</Text>
                    </Pressable>
                  </View>

                  {/* Chips de etiquetas disponibles */}
                  <ScrollView
                    style={styles.tagsScrollList}
                    contentContainerStyle={{ paddingBottom: 6 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.tagsChipsWrap}>
                      {tags.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <Pressable
                            key={tag}
                            onPress={() => {
                              if (selectedTags.includes(tag)) {
                                setSelectedTags(selectedTags.filter((t) => t !== tag));
                              } else {
                                setSelectedTags([...selectedTags, tag]);
                              }
                            }}
                            style={[
                              styles.tagSelectorChip,
                              {
                                backgroundColor: isDark ? colors.surfaceSecondary : colors.backgroundSubtle,
                                borderColor: colors.border,
                              },
                              isSelected && {
                                backgroundColor: isDark ? 'rgba(255, 104, 0, 0.18)' : 'rgba(255, 104, 0, 0.12)',
                                borderColor: colors.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tagSelectorChipText,
                                { color: isSelected ? colors.primary : colors.text },
                                isSelected && { fontWeight: '700' },
                              ]}
                            >
                              {isSelected ? `✓ ${tag}` : tag}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>

                  <Pressable
                    onPress={() => {
                      Keyboard.dismiss();
                      setShowTagsModal(false);
                    }}
                    style={[styles.tagsConfirmBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.tagsConfirmBtnText, { color: '#FFFFFF' }]}>
                      Listo {selectedTags.length > 0 ? `(${selectedTags.length})` : ''}
                    </Text>
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </Modal>
          )}
      </Modal>
    );
  }

  // =========================================================================
  // VIEW B: FULL-SCREEN ASISTENTE INTELIGENTE
  // =========================================================================
  if (currentView === 'ai') {
    return (
      <Modal visible={modalRendered} animationType="slide" transparent={false} onRequestClose={resetAndClose}>
        <View style={[styles.fullScreenWrapper, { paddingTop: Math.max(insets.top, 16) }]}>
          {/* Header */}
          <View style={styles.fullScreenHeader}>
            <Pressable
              onPress={() => setCurrentView('selection')}
              style={styles.backBtnRow}
              hitSlop={14}
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
              <Text style={styles.fullScreenTitle}>Asistente Inteligente</Text>
            </Pressable>
            <Pressable onPress={resetAndClose} style={styles.fullScreenCloseBtn} hitSlop={14}>
              <Ionicons name="close" size={22} color="rgba(255, 255, 255, 0.55)" />
            </Pressable>
          </View>

          {/* Sub-tabs selector */}
          <View style={styles.aiTabsRow}>
            <Pressable
              onPress={() => setAiSubTab('text')}
              style={[
                styles.aiTabPill,
                aiSubTab === 'text' && { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: colors.primary },
              ]}
            >
              <Text style={styles.aiTabEmoji}>✍️</Text>
              <Text style={[styles.aiTabTitle, aiSubTab === 'text' && { color: colors.primary }]}>
                Texto
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAiSubTab('voice')}
              style={[
                styles.aiTabPill,
                aiSubTab === 'voice' && { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: colors.primary },
              ]}
            >
              <Text style={styles.aiTabEmoji}>🎙️</Text>
              <Text style={[styles.aiTabTitle, aiSubTab === 'voice' && { color: colors.primary }]}>
                Voz
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setAiSubTab('ocr')}
              style={[
                styles.aiTabPill,
                aiSubTab === 'ocr' && { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: colors.primary },
              ]}
            >
              <Text style={styles.aiTabEmoji}>📸</Text>
              <Text style={[styles.aiTabTitle, aiSubTab === 'ocr' && { color: colors.primary }]}>
                Recibo OCR
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.fullScreenScroll} contentContainerStyle={styles.fullScreenScrollContent}>
            {/* SUB-TAB 1: TEXT NLP */}
            {aiSubTab === 'text' && (
              <View style={styles.aiContentBox}>
                <Text style={styles.aiIntroText}>
                  Escribe en lenguaje cotidiano y la IA detectará el monto, categoría y fecha.
                </Text>

                <TextInput
                  value={aiText}
                  onChangeText={setAiText}
                  placeholder="Ej: Gasté 750 pesos en gasolina en Shell"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  style={styles.aiLargeInput}
                  multiline
                />

                <Pressable
                  onPress={handleParseAiText}
                  style={[styles.aiActionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="sparkles" size={18} color="#0D0C0A" />
                  <Text style={styles.aiActionBtnText}>Interpretar con IA</Text>
                </Pressable>

                {/* Parsed Result Card */}
                {parsedPreview && (
                  <View style={styles.parsedCard}>
                    <Text style={styles.parsedTitle}>✨ Detección de la IA:</Text>
                    <View style={styles.parsedRow}>
                      <Text style={styles.parsedLabel}>Tipo:</Text>
                      <Text style={styles.parsedVal}>
                        {parsedPreview.type === 'expense' ? 'Gasto 🔻' : 'Ingreso 🔺'}
                      </Text>
                    </View>
                    <View style={styles.parsedRow}>
                      <Text style={styles.parsedLabel}>Monto:</Text>
                      <Text style={[styles.parsedVal, { color: colors.primary, fontWeight: '800' }]}>
                        {currencySymbol}
                        {parsedPreview.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.parsedRow}>
                      <Text style={styles.parsedLabel}>Categoría:</Text>
                      <Text style={styles.parsedVal}>
                        {getCategoryEmoji(parsedPreview.categoryId)}{' '}
                        {categories.find((c) => c.id === parsedPreview.categoryId)?.name || 'General'}
                      </Text>
                    </View>
                    {parsedPreview.merchant ? (
                      <View style={styles.parsedRow}>
                        <Text style={styles.parsedLabel}>Comercio:</Text>
                        <Text style={styles.parsedVal}>{parsedPreview.merchant}</Text>
                      </View>
                    ) : null}
                  </View>
                )}
              </View>
            )}

            {/* SUB-TAB 2: VOICE */}
            {aiSubTab === 'voice' && (
              <View style={styles.aiContentBox}>
                <Text style={styles.aiIntroText}>
                  Toca el micrófono y dicta tu movimiento como hablas naturalmente.
                </Text>

                <View style={styles.micCircleBox}>
                  <Pressable
                    onPress={() => handleSimulateVoice(VOICE_SAMPLES[Math.floor(Math.random() * VOICE_SAMPLES.length)])}
                    style={[
                      styles.micBigCircle,
                      isRecording && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                    ]}
                  >
                    <Ionicons name="mic" size={40} color="#FFFFFF" />
                  </Pressable>
                  <Text style={styles.micStatusText}>
                    {isRecording ? 'Escuchando tu voz...' : 'Toca para hablar'}
                  </Text>
                </View>

                {voiceTranscript ? (
                  <View style={styles.transcriptBox}>
                    <Text style={styles.transcriptLabel}>Transcripción:</Text>
                    <Text style={styles.transcriptText}>"{voiceTranscript}"</Text>
                  </View>
                ) : null}

                {voiceParsed && (
                  <View style={styles.parsedCard}>
                    <Text style={styles.parsedTitle}>✨ Movimiento Detectado:</Text>
                    <View style={styles.parsedRow}>
                      <Text style={styles.parsedLabel}>Monto:</Text>
                      <Text style={[styles.parsedVal, { color: colors.primary, fontWeight: '800' }]}>
                        {currencySymbol}
                        {voiceParsed.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.parsedRow}>
                      <Text style={styles.parsedLabel}>Categoría:</Text>
                      <Text style={styles.parsedVal}>
                        {getCategoryEmoji(voiceParsed.categoryId)}{' '}
                        {categories.find((c) => c.id === voiceParsed.categoryId)?.name || 'General'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* SUB-TAB 3: OCR */}
            {aiSubTab === 'ocr' && (
              <View style={styles.aiContentBox}>
                <Text style={styles.aiIntroText}>
                  Toma foto a una factura o recibo. La IA extraerá los datos automáticamente.
                </Text>

                <View style={styles.receiptsCarousel}>
                  {SAMPLE_RECEIPTS.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => handleSelectReceipt(r)}
                      style={[
                        styles.receiptCard,
                        selectedReceipt.id === r.id && { borderColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.rcpMerchant}>{r.merchant}</Text>
                      <Text style={styles.rcpTotal}>
                        {currencySymbol}
                        {r.total.toFixed(2)}
                      </Text>
                      <Text style={styles.rcpDate}>{r.date}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={handleScanReceipt}
                  style={[styles.aiActionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="camera" size={18} color="#0D0C0A" />
                  <Text style={styles.aiActionBtnText}>
                    {isScanning ? 'Escaneando ticket...' : 'Escanear Recibo'}
                  </Text>
                </Pressable>

                <View style={styles.ocrFieldsBox}>
                  <Text style={styles.ocrFieldLabel}>Comercio:</Text>
                  <TextInput
                    value={ocrMerchant}
                    onChangeText={setOcrMerchant}
                    style={styles.ocrInput}
                  />

                  <Text style={styles.ocrFieldLabel}>Monto Total:</Text>
                  <TextInput
                    value={ocrTotal}
                    onChangeText={setOcrTotal}
                    keyboardType="numeric"
                    style={styles.ocrInput}
                  />
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Confirm Save AI Button */}
          <View style={[styles.bottomSaveAiBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable
              onPress={handleSaveAi}
              style={[styles.saveBigBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#0D0C0A" />
              <Text style={[styles.saveBigBtnText, { color: '#0D0C0A' }]}>
                Confirmar y Guardar Movimiento
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  // =========================================================================
  // VIEW C: SELECTION BOTTOM SHEET (ASISTENTE IA, GASTO, INGRESO)
  // =========================================================================
  return (
    <Modal
      visible={modalRendered}
      animationType="none"
      transparent
      onRequestClose={resetAndClose}
    >
      <View style={styles.modalRoot}>
        {/* Fondo oscurecido con Fade suave independiente (se queda fijo) */}
        <Animated.View style={[styles.backdropOverlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={resetAndClose} />
        </Animated.View>

        {/* Contenedor interactivo que aloja la hoja que sube desde abajo */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
          pointerEvents="box-none"
        >
          {/* Zona superior vacía para tocar fuera y cerrar */}
          <Pressable
            style={styles.backdropDismissArea}
            onPress={resetAndClose}
            accessibilityLabel="Cerrar modal"
          />

          <Animated.View
            style={[
              styles.bottomSheetCard,
              {
                backgroundColor: colors.card,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                transform: [{ translateY: slideAnim }],
                marginBottom: Math.max(insets.bottom, 14) + 10,
              },
            ]}
          >
            {/* Top Drag Handle */}
            <View style={styles.topHandle} />

            <View style={styles.selectionContainer}>
              {/* Asistente Inteligente (Full-width card) */}
              <Pressable
                onPress={handleOpenAi}
                style={({ pressed }) => [
                  styles.aiFullCard,
                  {
                    backgroundColor: colors.backgroundSubtle,
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.aiCardLeft}>
                  <View style={[styles.aiIconCircle, { backgroundColor: colors.primaryGlow }]}>
                    <Ionicons name="sparkles" size={22} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.aiCardTitle, { color: colors.text }]}>
                      Asistente Inteligente
                    </Text>
                    <Text style={[styles.aiCardSub, { color: colors.textSecondary }]}>
                      Dicta, toma una foto o escribe
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </Pressable>

              {/* Botones Gasto e Ingreso lado a lado */}
              <View style={styles.actionSquareRow}>
                {/* Gasto Manual */}
                <Pressable
                  onPress={handleOpenExpense}
                  style={({ pressed }) => [
                    styles.squareCard,
                    {
                      backgroundColor: colors.backgroundSubtle,
                      borderColor: 'rgba(239, 68, 68, 0.25)',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.squareIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="trending-down" size={22} color="#EF4444" />
                  </View>
                  <Text style={[styles.squareTitle, { color: colors.text }]}>Gasto</Text>
                  <Text style={[styles.squareSub, { color: colors.textSecondary }]}>Manual</Text>
                </Pressable>

                {/* Ingreso Manual */}
                <Pressable
                  onPress={handleOpenIncome}
                  style={({ pressed }) => [
                    styles.squareCard,
                    {
                      backgroundColor: colors.backgroundSubtle,
                      borderColor: 'rgba(16, 185, 129, 0.25)',
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={[styles.squareIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="trending-up" size={22} color="#10B981" />
                  </View>
                  <Text style={[styles.squareTitle, { color: colors.text }]}>Ingreso</Text>
                  <Text style={[styles.squareSub, { color: colors.textSecondary }]}>Manual</Text>
                </Pressable>
              </View>

              {/* Botón Registros Comunes (Solo si existen registros comunes - Imagen 2) */}
              {commonTemplates && commonTemplates.length > 0 && (
                <Pressable
                  onPress={() => setShowCommonTemplatesSheet(true)}
                  style={({ pressed }) => [
                    styles.commonTemplatesCard,
                    {
                      backgroundColor: colors.backgroundSubtle,
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.commonTemplatesCardLeft}>
                    <View style={[styles.commonTemplatesIconCircle, { backgroundColor: isDark ? '#1E293B' : 'rgba(59, 130, 246, 0.15)' }]}>
                      <Ionicons name="clipboard-outline" size={19} color="#60A5FA" />
                    </View>
                    <Text style={[styles.commonTemplatesTitle, { color: colors.text }]}>
                      Registros comunes
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.4)" />
                </Pressable>
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>

        {/* Sheet Registros Comunes (Exacto a Imagen 3) */}
        {showCommonTemplatesSheet && (
          <Modal visible={showCommonTemplatesSheet} transparent animationType="slide">
            <View style={styles.commonSheetOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowCommonTemplatesSheet(false)}
              />
              <View
                style={[
                  styles.commonSheetCard,
                  {
                    backgroundColor: isDark ? '#141824' : colors.card,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : colors.border,
                    marginBottom: Math.max(insets.bottom, 14) + 10,
                  },
                ]}
              >
                <View style={styles.commonDragHandle} />

                <View style={styles.commonSheetHeader}>
                  <View>
                    <Text style={[styles.commonSheetTitle, { color: colors.text }]}>
                      Registros comunes
                    </Text>
                    <Text style={[styles.commonSheetSub, { color: colors.textSecondary }]}>
                      Toca un registro para ingresarlo de una vez.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowCommonTemplatesSheet(false)}
                    hitSlop={8}
                    style={styles.sheetCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 10, paddingTop: 4 }}>
                    {commonTemplates.map((t) => {
                      const cat = categories.find((c) => c.id === t.categoryId);
                      const isExpense = (t.type || 'expense') === 'expense';
                      return (
                        <Pressable
                          key={t.id}
                          onPress={() => {
                            executeCommonTemplate(t);
                            setShowCommonTemplatesSheet(false);
                            resetAndClose();
                          }}
                          style={({ pressed }) => [
                            styles.quickTmplItem,
                            {
                              backgroundColor: isDark ? '#1A2030' : colors.backgroundSubtle,
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : colors.border,
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <View style={[styles.quickTmplIconBox, { backgroundColor: isExpense ? '#0F2F24' : '#133529' }]}>
                            <Text style={{ fontSize: 20 }}>{t.emoji || (isExpense ? '🧺' : '💼')}</Text>
                          </View>

                          <View style={styles.quickTmplInfo}>
                            <Text style={[styles.quickTmplName, { color: colors.text }]} numberOfLines={1}>
                              {t.name}
                            </Text>
                            <Text style={[styles.quickTmplCat, { color: colors.textSecondary }]}>
                              {cat?.name || 'General'}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.quickTmplAmount,
                              { color: isExpense ? colors.text : '#10B981' },
                            ]}
                          >
                            {isExpense ? '-' : '+'}
                            {currencySymbol}
                            {t.amount.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // ==========================================
  // PAYPAL / APPLE PAY MINIMALIST LUXURY STYLES
  // ==========================================
  fullScreenPaypalWrapper: {
    flex: 1,
    justifyContent: 'space-between',
  },
  paypalModalWrapper: {
    flex: 1,
  },
  paypalHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  paypalCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paypalTypeSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 3,
    gap: 2,
  },
  paypalTypeSegment: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paypalTypeSegmentText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },
  paypalTypeSegmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  paypalDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
  },
  paypalDatePillText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  paypalScroll: {
    flex: 1,
  },
  paypalScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  paypalContextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    width: '100%',
    minHeight: 56,
  },
  paypalContextAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paypalContextEmoji: {
    fontSize: 20,
  },
  paypalContextTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  paypalContextName: {
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  paypalContextSub: {
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },
  paypalContextChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paypalContextChangeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  paypalHeroAmountSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  paypalAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  nativeHeroAmountInput: {
    fontWeight: '800',
    letterSpacing: -1,
    padding: 0,
    margin: 0,
    textAlign: 'left',
    minWidth: 40,
  },
  paypalCurrencySymbol: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 6,
  },
  paypalAmountInteger: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  paypalAmountDecimal: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 1,
  },
  paypalBalanceSubtext: {
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  paypalNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    width: '100%',
    minHeight: 56,
  },
  paypalNoteInput: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '500',
    padding: 0,
    margin: 0,
  },
  paypalPillsScroll: {
    marginBottom: 10,
  },
  paypalPillsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paypalSwiftChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  paypalSwiftChipText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  paypalInlineNoteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  paypalInlineNoteInput: {
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
    margin: 0,
    minHeight: 38,
  },
  paypalInlineCharCount: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },
  paypalKeypadWrapper: {
    gap: 8,
    marginBottom: 6,
  },
  paypalKeypadRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  paypalKeypadKey: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  paypalKeypadDigit: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  paypalBottomBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  paypalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  paypalToggleLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  paypalSubmitBtnWrapper: {
    width: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  paypalSubmitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 28,
  },
  paypalSubmitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  // ==========================================
  // IMPROVED LUXURY GASTO / INGRESO STYLES
  // ==========================================
  improvedModalWrapper: {
    flex: 1,
    backgroundColor: '#0C0E14',
    justifyContent: 'space-between',
  },
  improvedSavedToast: {
    position: 'absolute',
    top: 52,
    alignSelf: 'center',
    zIndex: 99,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(28, 32, 45, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  savedToastCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedToastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  improvedHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  improvedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  improvedCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  improvedBrandBadge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  improvedHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  improvedHeaderTitleAccent: {
    fontWeight: '800',
  },
  improvedHeaderSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 1,
  },
  typeSwitcherCompact: {
    flexDirection: 'row',
    backgroundColor: '#161924',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  typeSwitcherPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
  },
  typeSwitcherPillActiveExpense: {
    backgroundColor: '#FF6B00',
  },
  typeSwitcherPillActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeSwitcherPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  typeSwitcherPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  improvedScrollArea: {
    flex: 1,
  },
  improvedScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  improvedAmountCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  amountCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  amountPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  amountPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  amountDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  amountDateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  improvedAmountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  improvedCurrencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 6,
    marginTop: 4,
  },
  improvedAmountTextInput: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : undefined,
    padding: 0,
    margin: 0,
    textAlign: 'center',
    minWidth: 32,
  },
  improvedAmountIntText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : undefined,
  },
  improvedAmountDecText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 1,
    marginTop: 6,
  },
  improvedMetadataCard: {
    backgroundColor: '#161924',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: 8,
    overflow: 'hidden',
  },
  improvedMetadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  metadataIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1C202D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  metadataInputCol: {
    flex: 1,
    justifyContent: 'center',
  },
  metadataLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metadataTextInput: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
    padding: 0,
    margin: 0,
  },
  metadataValueText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metadataPlaceholderText: {
    color: '#64748B',
  },
  improvedQuickActionsContainer: {
    marginBottom: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  quickActionBtn: {
    flex: 1,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#14161F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  quickActionBtnActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    borderColor: 'rgba(255, 107, 0, 0.50)',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  quickActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  quickActionBtnTextActive: {
    color: '#FF8C38',
    fontWeight: '700',
  },
  improvedNoteBox: {
    backgroundColor: '#161924',
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginTop: 6,
  },
  improvedNoteTextInput: {
    fontSize: 12,
    color: '#FFFFFF',
    minHeight: 40,
    textAlignVertical: 'top',
    padding: 0,
  },
  improvedNoteCharCountRow: {
    alignItems: 'flex-end',
    marginTop: 2,
  },
  improvedNoteCharCountText: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  improvedKeypadContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  improvedKeypadRow: {
    flexDirection: 'row',
    gap: 7,
  },
  improvedKeypadKey: {
    flex: 1,
    height: 44,
    backgroundColor: '#1C202D',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  improvedKeypadKeyTransparent: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  improvedKeypadKeyPressed: {
    backgroundColor: '#262C3E',
    borderColor: 'rgba(255, 107, 0, 0.4)',
    transform: [{ scale: 0.96 }],
  },
  improvedKeyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  improvedKeyDigitText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : undefined,
  },
  improvedKeySubText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginTop: 1,
  },
  improvedKeypadDotText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
  },
  improvedBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#0C0E14',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  improvedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  improvedToggleTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  improvedToggleSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  improvedSaveBtnWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  improvedSaveBtnGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 8,
  },
  improvedSaveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tagsModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  tagsModalCard: {
    backgroundColor: '#181B24',
    borderRadius: 30,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#2B3142',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  tagsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tagsModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  newTagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  newTagTextInput: {
    flex: 1,
    backgroundColor: '#1E2330',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B3142',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FFFFFF',
  },
  newTagAddSubmitBtn: {
    backgroundColor: '#FF6800',
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newTagAddSubmitText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagsScrollList: {
    maxHeight: 200,
  },
  tagsChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
  },
  tagSelectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  tagSelectorChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.18)',
    borderColor: '#FF6B00',
  },
  tagSelectorChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tagSelectorChipTextActive: {
    color: '#FF8C38',
    fontWeight: '700',
  },
  tagsConfirmBtn: {
    backgroundColor: '#FF6B00',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  tagsConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ==========================================
  // FULL SCREEN WRAPPER STYLES
  // ==========================================
  fullScreenWrapper: {
    flex: 1,
    backgroundColor: '#0D0F15',
    justifyContent: 'space-between',
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#161B26',
    borderWidth: 1,
    borderColor: '#00C076',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  toastText: {
    fontSize: 13,
    color: '#00C076',
    fontWeight: '700',
  },
  fullScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullScreenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  fullScreenCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenScroll: {
    flex: 1,
  },
  fullScreenScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Hero Amount
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 12,
    gap: 10,
  },
  currencyCodeText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  amountDisplayGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroAmountNumber: {
    fontSize: 50,
    fontWeight: '800',
    letterSpacing: -1,
  },
  blinkingCursor: {
    width: 3.5,
    height: 44,
    borderRadius: 2,
    marginLeft: 6,
  },

  // Date Pill
  datePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: '#1C1A16',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 18,
  },
  datePillLabel: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Form Fields
  formSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  formSectionLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionSublabel: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  seeAllCategoriesText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FF6800',
  },
  descriptionInputBox: {
    backgroundColor: '#181B24',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2B3142',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  descriptionInput: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },

  // Etiquetas Section
  tagsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  newTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 104, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FF6800',
  },
  newTagBtnText: {
    fontSize: 12.5,
    color: '#FF6800',
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#181B24',
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  tagPillActive: {
    backgroundColor: 'rgba(255, 104, 0, 0.22)',
    borderColor: '#FF6800',
  },
  tagPillText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  tagPillTextActive: {
    color: '#FF6800',
    fontWeight: '700',
  },

  // Opciones Adicionales Row
  extraOptionsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  extraOptionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1815',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  extraOptionPillActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  extraOptionText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },
  extraOptionTextActive: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  noteInputBox: {
    marginTop: 10,
    backgroundColor: '#161410',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
  },
  noteTextInput: {
    fontSize: 13,
    color: '#FFFFFF',
    minHeight: 50,
  },

  // Category Selected Card
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161410',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 10,
  },
  catCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catCardEmojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCardEmoji: {
    fontSize: 22,
  },
  catCardName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catCardSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },

  // Quick Category Chips
  categoryChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1815',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  quickChipEmoji: {
    fontSize: 14,
  },
  quickChipText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '600',
  },

  // Bottom Control Area (Holds Numpad + Save Button)
  bottomControlArea: {
    backgroundColor: '#0D0F15',
    borderTopWidth: 1,
    borderTopColor: '#2B3142',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  numpadContainer: {
    backgroundColor: '#181B24',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#2B3142',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  numpadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  numpadHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  numpadHint: {
    fontSize: 12,
    color: 'rgba(255, 253, 245, 0.55)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hideNumpadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.32)',
  },
  hideNumpadText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#F97316',
  },
  numpadGrid: {},
  numpadRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  numpadKey: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#201A14',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.12)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1.5 },
    elevation: 2,
  },
  numpadKeyBackspace: {
    backgroundColor: '#1C1510',
    borderColor: 'rgba(239, 68, 68, 0.22)',
  },
  numpadKeyDot: {
    backgroundColor: '#1C1712',
    borderColor: 'rgba(249, 115, 22, 0.15)',
  },
  numpadKeyPressed: {
    backgroundColor: 'rgba(249, 115, 22, 0.25)',
    borderColor: '#F97316',
    transform: [{ scale: 0.96 }],
  },
  keyContentBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  numpadDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFDF5',
    letterSpacing: -0.3,
  },
  numpadDotText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F97316',
    lineHeight: 28,
  },
  numpadLetters: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(249, 115, 22, 0.7)',
    letterSpacing: 1.6,
    marginTop: 1,
  },

  // Guardar y agregar otro toggle row
  addAnotherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  addAnotherLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },

  // Big Save Button
  saveBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 16,
  },
  saveBigBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Category Modal Picker
  catModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  catModalCard: {
    backgroundColor: '#181B24',
    borderRadius: 30,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#2B3142',
    height: '76%',
    padding: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  catModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  catModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createCatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6800',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 14,
  },
  createCatBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  catModalList: {
    flex: 1,
  },
  catModalItemWrapper: {
    marginBottom: 10,
  },
  catModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2B3142',
    borderRadius: 16,
    padding: 12,
  },
  catModalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catModalItemEmoji: {
    fontSize: 26,
  },
  catModalItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  catModalItemCount: {
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  subcatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingLeft: 46,
    paddingTop: 8,
    paddingBottom: 4,
  },
  subcatPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#232938',
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  subcatPillText: {
    fontSize: 11.5,
    color: '#CBD5E1',
    fontWeight: '600',
  },

  // Modal Prompts (for New Tag / New Category)
  promptBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181B24',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  promptSub: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginBottom: 14,
    lineHeight: 17,
  },
  promptInput: {
    backgroundColor: '#1E2330',
    borderWidth: 1,
    borderColor: '#2B3142',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  promptFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
  },
  emojiPickerRow: {
    gap: 8,
    paddingBottom: 14,
  },
  emojiChoiceBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E2330',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2B3142',
  },
  emojiChoiceBtnActive: {
    backgroundColor: 'rgba(255, 104, 0, 0.22)',
    borderColor: '#FF6800',
  },
  colorPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  colorChoiceCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorChoiceCircleActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  promptBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  promptCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  promptCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  promptConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  promptConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0D0C0A',
  },

  // AI Assistant Full-Screen Styles
  aiTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  aiTabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#1A1815',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  aiTabEmoji: {
    fontSize: 15,
  },
  aiTabTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  aiContentBox: {
    marginTop: 4,
  },
  aiIntroText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 14,
    lineHeight: 18,
  },
  aiLargeInput: {
    backgroundColor: '#161410',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 14,
    fontSize: 15,
    color: '#FFFFFF',
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  aiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginBottom: 16,
  },
  aiActionBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D0C0A',
  },
  parsedCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    padding: 16,
    gap: 10,
  },
  parsedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 2,
  },
  parsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parsedLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    fontWeight: '600',
  },
  parsedVal: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  micCircleBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  micBigCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FBBF24',
    marginBottom: 12,
  },
  micStatusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  transcriptBox: {
    backgroundColor: '#161410',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.45)',
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  receiptsCarousel: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  receiptCard: {
    flex: 1,
    backgroundColor: '#161410',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 12,
  },
  rcpMerchant: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  rcpTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#EF4444',
  },
  rcpDate: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
  ocrFieldsBox: {
    backgroundColor: '#161410',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  ocrFieldLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  ocrInput: {
    backgroundColor: '#1C1A16',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSaveAiBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#0D0F15',
    borderTopWidth: 1,
    borderTopColor: '#2B3142',
  },

  // ==========================================
  // BOTTOM SHEET STYLES (VIEW C)
  // ==========================================
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
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
  bottomSheetCard: {
    borderRadius: 32,
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 22,
    marginHorizontal: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  topHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  selectionContainer: {
    gap: 12,
  },
  aiFullCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  aiCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  aiIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  aiCardSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  actionSquareRow: {
    flexDirection: 'row',
    gap: 12,
  },
  squareCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  squareTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  squareSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  commonTemplatesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 12,
  },
  commonTemplatesCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  commonTemplatesIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commonTemplatesTitle: {
    fontSize: 15.5,
    fontWeight: '700',
  },
  commonSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  commonSheetCard: {
    borderRadius: 32,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  commonDragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  commonSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  commonSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  commonSheetSub: {
    fontSize: 13,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTmplItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  quickTmplIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickTmplInfo: {
    flex: 1,
  },
  quickTmplName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickTmplCat: {
    fontSize: 12,
  },
  quickTmplAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});

// ==========================================
// DATE PICKER MODAL STYLES (EXACT TO LUKAS)
// ==========================================
const dateStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#161B26', // Deep navy/dark obsidian matching Lukas
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
    marginBottom: 8,
  },
  dayNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  chevronBtn: {
    padding: 4,
  },
  currentDayTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  quickPillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  quickPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#222B38',
  },
  quickPillActive: {
    backgroundColor: '#00C076',
  },
  quickPillText: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  quickPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  monthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  monthTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  monthTitleText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  monthArrows: {
    flexDirection: 'row',
    gap: 16,
  },
  monthArrowBtn: {
    padding: 2,
  },
  weekdaysHeader: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    width: '14.285%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  dayCell: {
    width: '14.285%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#00C076',
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dayNumberTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#00C076',
  },
  okBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#00C076',
  },
});

