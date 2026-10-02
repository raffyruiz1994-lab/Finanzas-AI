import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CurrencyCode } from '@/types';
import { apiClient } from '@/api/apiClient';
import { startGoogleSignIn, startAppleSignIn } from '@/services/auth/oauthService';

export interface UserProfile {
  id?: string;
  name: string;
  email: string | null;
  provider: 'google' | 'apple' | 'email' | 'guest';
  avatarUrl?: string | null;
  createdAt?: string;
  isPro?: boolean;
}

interface SettingsState {
  themeMode: 'dark' | 'light' | 'system';
  currency: CurrencyCode;
  isPrivacyHidden: boolean;
  isDemoMode: boolean;
  currentPeriod: string; // ej. 'SEP DE 2026'
  budgetPeriod: string; // 'Mensual' | 'Quincenal' | 'Semanal' | 'Anual'
  isSafeSpendVisible: boolean;
  notifications: {
    dailyReminder: boolean;
    reminderTime: string;
    budgetAlerts: boolean;
    recurringAlerts: boolean;
  };
  
  // Auth state
  user: UserProfile | null;
  isGuest: boolean;
  
  setThemeMode: (mode: 'dark' | 'light' | 'system') => void;
  setCurrency: (currency: CurrencyCode) => void;
  togglePrivacyHidden: () => void;
  toggleDemoMode: () => void;
  setCurrentPeriod: (period: string) => void;
  setBudgetPeriod: (budgetPeriod: string) => void;
  setIsSafeSpendVisible: (visible: boolean) => void;
  updateNotifications: (updates: Partial<SettingsState['notifications']>) => void;
  
  // Real Auth actions
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  loginWithApple: () => Promise<{ success: boolean; error?: string; canceled?: boolean }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  checkAuthSession: () => Promise<void>;
  loginAsGuest: () => void;
  logout: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themeMode: 'dark',
      currency: 'DOP',
      isPrivacyHidden: false,
      isDemoMode: true,
      currentPeriod: 'SEP DE 2026',
      budgetPeriod: 'Mensual',
      isSafeSpendVisible: true,
      notifications: {
        dailyReminder: true,
        reminderTime: '20:00',
        budgetAlerts: true,
        recurringAlerts: true,
      },
      user: null,
      isGuest: false,

  setThemeMode: (themeMode) => {
    set({ themeMode });
    AsyncStorage.setItem('finanzas_ai_theme', themeMode).catch(() => {});
  },

  setCurrency: (currency) => {
    set({ currency });
    AsyncStorage.setItem('finanzas_ai_currency', currency).catch(() => {});
  },

  togglePrivacyHidden: () => {
    set((state) => ({ isPrivacyHidden: !state.isPrivacyHidden }));
  },

  toggleDemoMode: () => {
    set((state) => ({ isDemoMode: !state.isDemoMode }));
  },

  setCurrentPeriod: (currentPeriod) => {
    set({ currentPeriod });
  },

  setBudgetPeriod: (budgetPeriod) => {
    set({ budgetPeriod });
    AsyncStorage.setItem('finanzas_ai_budget_period', budgetPeriod).catch(() => {});
  },

  setIsSafeSpendVisible: (isSafeSpendVisible) => {
    set({ isSafeSpendVisible });
    AsyncStorage.setItem('finanzas_ai_safe_spend_visible', String(isSafeSpendVisible)).catch(() => {});
  },

  updateNotifications: (updates) => {
    set((state) => ({
      notifications: { ...state.notifications, ...updates },
    }));
  },

  loginWithEmail: async (email, password) => {
    const res = await apiClient.login(email, password);
    if (res.success && res.data?.user) {
      const u = res.data.user;
      set({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatar || null,
          provider: 'email',
          isPro: !!u.isPro,
          createdAt: u.created_at || new Date().toISOString(),
        },
        isGuest: false,
      });
      return { success: true };
    }
    return { success: false, error: res.error || 'Credenciales inválidas.' };
  },

  registerWithEmail: async (name, email, password) => {
    const res = await apiClient.register(name, email, password);
    if (res.success && res.data?.user) {
      const u = res.data.user;
      set({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatar || null,
          provider: 'email',
          isPro: !!u.isPro,
          createdAt: u.created_at || new Date().toISOString(),
        },
        isGuest: false,
      });
      return { success: true };
    }
    return { success: false, error: res.error || 'Error al registrar la cuenta.' };
  },

  loginWithGoogle: async () => {
    const result = await startGoogleSignIn();
    if (result.success && result.user) {
      const u = result.user;
      set({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatar || null,
          provider: 'google',
          isPro: !!u.isPro,
          createdAt: u.created_at || new Date().toISOString(),
        },
        isGuest: false,
      });
      return { success: true };
    }
    return { success: false, error: result.error, canceled: result.canceled };
  },

  loginWithApple: async () => {
    const result = await startAppleSignIn();
    if (result.success && result.user) {
      const u = result.user;
      set({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatar || null,
          provider: 'apple',
          isPro: !!u.isPro,
          createdAt: u.created_at || new Date().toISOString(),
        },
        isGuest: false,
      });
      return { success: true };
    }
    return { success: false, error: result.error, canceled: result.canceled };
  },

  forgotPassword: async (email) => {
    const res = await apiClient.forgotPassword(email);
    if (res.success) {
      return { success: true, message: res.data?.message || 'Enlace enviado si el correo está registrado.' };
    }
    return { success: false, error: res.error || 'Error al procesar la solicitud.' };
  },

  resetPassword: async (token, newPassword) => {
    const res = await apiClient.resetPassword(token, newPassword);
    if (res.success) {
      return { success: true, message: res.data?.message || 'Contraseña actualizada.' };
    }
    return { success: false, error: res.error || 'Error al restablecer la contraseña.' };
  },

  checkAuthSession: async () => {
    const token = apiClient.getToken();
    if (!token) return;
    const res = await apiClient.getMe();
    if (res.success && res.data) {
      const u = res.data;
      set({
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          avatarUrl: u.avatar || null,
          provider: (u.providers?.[0] as any) || 'email',
          isPro: !!u.isPro,
          createdAt: u.created_at,
        },
        isGuest: false,
      });
    } else if (res.error?.includes('expirada') || res.error?.includes('No autorizado')) {
      await apiClient.logout();
      set({ user: null });
    }
  },

  loginAsGuest: () => {
    set({ user: null, isGuest: true });
  },

  logout: async () => {
    await apiClient.logout();
    set({ user: null, isGuest: false });
  },
    }),
    {
      name: 'finanzas_ai_settings_store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);


