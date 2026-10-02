import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

export const ThemeColors = {
  dark: {
    // Backgrounds & Surfaces
    background: '#0D0F15', // Dashboard negro profundo / obsidiana
    backgroundSubtle: '#12151E',
    surface: '#181B24', // Superficie principal
    surfaceSecondary: '#1E2330', // Superficie secundaria / elevada
    card: '#181B24', // Dashboard tarjeta grafito oscuro
    cardElevated: '#1E2330', // Tarjeta elevada
    cardBorder: '#2B3142', // Borde nítido dashboard
    border: '#2B3142',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    divider: '#222634',

    // Typography
    text: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8', // Gris azulado moderno dashboard
    textMuted: '#64748B',
    textInverted: '#0F172A',

    // Primary Brand - Naranja Radiante vibrante del Dashboard
    primary: '#FF6800',
    primaryGlow: 'rgba(255, 104, 0, 0.22)',
    primarySoft: 'rgba(255, 104, 0, 0.15)',
    primaryDark: '#E65100',

    // Gold Accents
    goldLight: '#FDE047',
    goldGlow: 'rgba(253, 224, 71, 0.35)',

    // Financial States
    income: '#10B981',
    incomeBg: 'rgba(16, 185, 129, 0.15)',
    expense: '#EF4444',
    expenseBg: 'rgba(239, 68, 68, 0.15)',
    transfer: '#3B82F6',
    transferBg: 'rgba(59, 130, 246, 0.15)',
    warning: '#F59E0B',
    warningBg: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.15)',
    info: '#3B82F6',
    infoBg: 'rgba(59, 130, 246, 0.15)',

    // Navigation & TabBar
    tabBarBg: '#111319',
    tabBarBorder: '#222634',
    tabBarActive: '#FF6800',
    tabBarInactive: '#94A3B8',

    // Glass & Overlays
    glassBg: 'rgba(24, 27, 36, 0.88)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    overlay: 'rgba(0, 0, 0, 0.72)',

    // Inputs & Controls
    input: '#1E2330',
    inputBackground: '#181B24',
    inputBorder: '#2B3142',
    inputPlaceholder: '#64748B',

    // Charts & Graphs
    chartGrid: '#222634',
    chartText: '#94A3B8',

    // Icons & Shadows
    icon: '#F8FAFC',
    iconMuted: '#64748B',
    cardShadow: '#000000',
    shadowOpacity: 0.38,
  },
  light: {
    // Backgrounds & Surfaces
    background: '#F8FAFC', // Fondo claro, limpio y cálido (Slate 50)
    backgroundSubtle: '#F1F5F9', // Fondo sutil (Slate 100)
    surface: '#FFFFFF', // Superficie principal blanca pura
    surfaceSecondary: '#F8FAFC', // Superficie secundaria
    card: '#FFFFFF', // Tarjeta blanca nítida
    cardElevated: '#FFFFFF', // Tarjeta elevada
    cardBorder: '#E2E8F0', // Borde gris suave (Slate 200)
    border: '#E2E8F0',
    borderSubtle: 'rgba(0, 0, 0, 0.05)',
    divider: '#EDF2F7',

    // Typography
    text: '#0F172A', // Texto principal oscuro de alto contraste (Slate 900)
    textPrimary: '#0F172A',
    textSecondary: '#475569', // Texto secundario suave (Slate 600)
    textMuted: '#94A3B8', // Texto atenuado (Slate 400)
    textInverted: '#FFFFFF',

    // Primary Brand - Naranja Radiante adaptado
    primary: '#FF6800',
    primaryGlow: 'rgba(255, 104, 0, 0.16)',
    primarySoft: 'rgba(255, 104, 0, 0.10)',
    primaryDark: '#E65100',

    // Gold Accents
    goldLight: '#D97706', // Oro cálido ámbar legible en fondo claro
    goldGlow: 'rgba(217, 119, 6, 0.22)',

    // Financial States
    income: '#059669', // Verde esmeralda vivo
    incomeBg: 'rgba(5, 150, 105, 0.12)',
    expense: '#DC2626', // Rojo coral vivo
    expenseBg: 'rgba(220, 38, 38, 0.12)',
    transfer: '#2563EB', // Azul vibrante
    transferBg: 'rgba(37, 99, 235, 0.12)',
    warning: '#D97706',
    warningBg: 'rgba(217, 119, 6, 0.12)',
    danger: '#DC2626',
    dangerBg: 'rgba(220, 38, 38, 0.10)',
    info: '#2563EB',
    infoBg: 'rgba(37, 99, 235, 0.12)',

    // Navigation & TabBar
    tabBarBg: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#FF6800',
    tabBarInactive: '#64748B',

    // Glass & Overlays
    glassBg: 'rgba(255, 255, 255, 0.92)',
    glassBorder: 'rgba(0, 0, 0, 0.08)',
    overlay: 'rgba(15, 23, 42, 0.45)',

    // Inputs & Controls
    input: '#F1F5F9',
    inputBackground: '#FFFFFF',
    inputBorder: '#CBD5E1',
    inputPlaceholder: '#94A3B8',

    // Charts & Graphs
    chartGrid: '#E2E8F0',
    chartText: '#64748B',

    // Icons & Shadows
    icon: '#334155',
    iconMuted: '#94A3B8',
    cardShadow: '#64748B',
    shadowOpacity: 0.08,
  },
} as const;

export type ColorTokens = {
  [K in keyof typeof ThemeColors.dark]: (typeof ThemeColors.dark)[K] extends number ? number : string;
};
export type ThemeColorTokens = ColorTokens;
export type AppTheme = ColorTokens;

export const Colors = {
  light: {
    text: ThemeColors.light.text,
    background: ThemeColors.light.background,
    backgroundElement: ThemeColors.light.card,
    backgroundSelected: ThemeColors.light.backgroundSubtle,
    textSecondary: ThemeColors.light.textSecondary,
  },
  dark: {
    text: ThemeColors.dark.text,
    background: ThemeColors.dark.background,
    backgroundElement: ThemeColors.dark.card,
    backgroundSelected: ThemeColors.dark.backgroundSubtle,
    textSecondary: ThemeColors.dark.textSecondary,
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const MaxContentWidth = 800;

/**
 * Hook global para acceder y controlar el tema en cualquier componente
 */
export function useAppTheme() {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const setThemeMode = useSettingsStore((state) => state.setThemeMode);
  const systemColorScheme = useColorScheme();

  const isDark =
    themeMode === 'system'
      ? systemColorScheme !== 'light'
      : themeMode === 'dark';

  const resolvedTheme: 'dark' | 'light' = isDark ? 'dark' : 'light';
  const colors: ColorTokens = ThemeColors[resolvedTheme];

  return {
    isDark,
    themeMode,
    resolvedTheme,
    colors,
    setThemeMode,
  };
}

export const useTheme = useAppTheme;
