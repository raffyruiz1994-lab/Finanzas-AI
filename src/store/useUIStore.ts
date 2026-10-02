import { create } from 'zustand';
import { haptic } from '@/utils/haptics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  createdAt: number;
}

export interface ShowToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface RegisteredTxEffectPayload {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  timestamp: number;
}

interface UIState {
  // Toasts
  toasts: ToastItem[];
  showToast: (options: ShowToastOptions | string) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  // Global Loading Overlay
  isLoading: boolean;
  loadingMessage?: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;

  // Active Bottom Sheet / Modal Tracker
  activeBottomSheet: string | null;
  openBottomSheet: (sheetName: string) => void;
  closeBottomSheet: () => void;

  // Global Error state
  globalError: string | null;
  setGlobalError: (error: string | null) => void;

  // Form Submitting state
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;

  // Recently Registered Transaction Effect (for Dashboard fluid animation & auto-scroll)
  lastRegisteredTx: RegisteredTxEffectPayload | null;
  triggerRegisteredTxEffect: (tx: Omit<RegisteredTxEffectPayload, 'timestamp'>) => void;
  clearRegisteredTxEffect: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],

  showToast: (options) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const toastData: ShowToastOptions =
      typeof options === 'string' ? { message: options, type: 'info' } : options;

    const newToast: ToastItem = {
      id,
      type: toastData.type || 'info',
      title: toastData.title,
      message: toastData.message,
      duration: toastData.duration || 3200,
      createdAt: Date.now(),
    };

    // Trigger matching tactical haptic
    switch (newToast.type) {
      case 'success':
        haptic.success();
        break;
      case 'error':
        haptic.error();
        break;
      case 'warning':
        haptic.warning();
        break;
      case 'info':
      default:
        haptic.light();
        break;
    }

    set((state) => ({
      toasts: [...state.toasts.slice(-2), newToast], // Keep max 3 toasts at a time
    }));

    // Auto-dismiss
    setTimeout(() => {
      get().dismissToast(id);
    }, newToast.duration);

    return id;
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearToasts: () => set({ toasts: [] }),

  isLoading: false,
  loadingMessage: undefined,
  showLoading: (loadingMessage) => set({ isLoading: true, loadingMessage }),
  hideLoading: () => set({ isLoading: false, loadingMessage: undefined }),

  activeBottomSheet: null,
  openBottomSheet: (activeBottomSheet) => set({ activeBottomSheet }),
  closeBottomSheet: () => set({ activeBottomSheet: null }),

  globalError: null,
  setGlobalError: (globalError) => set({ globalError }),

  isSubmitting: false,
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),

  lastRegisteredTx: null,
  triggerRegisteredTxEffect: (tx) => {
    set({
      lastRegisteredTx: {
        ...tx,
        timestamp: Date.now(),
      },
    });
  },
  clearRegisteredTxEffect: () => set({ lastRegisteredTx: null }),
}));

// Quick hook for toasts
export function useToast() {
  const showToast = useUIStore((state) => state.showToast);
  const dismissToast = useUIStore((state) => state.dismissToast);
  return { showToast, dismissToast };
}

