import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Account,
  Budget,
  Category,
  CategoryGroup,
  DebtLoan,
  RecurringPayment,
  RecurringSuggestion,
  SafeToSpendBreakdown,
  SavingsGoal,
  Transaction,
} from '@/types';
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY_GROUPS } from '@/constants/categories';
import { INITIAL_ACCOUNTS, INITIAL_BUDGETS, INITIAL_TRANSACTIONS } from './mockData';
import { calculateSafeToSpend } from '@/services/safeSpendService';
import { apiClient } from '@/api/apiClient';
import { useUIStore } from './useUIStore';

export interface CommonTemplate {
  id: string;
  name: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  emoji: string;
  tags?: string[];
  notes?: string;
  accountId?: string;
}

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  goals: SavingsGoal[];
  debts: DebtLoan[];
  recurring: RecurringPayment[];
  recurringSuggestions: RecurringSuggestion[];
  tags: string[];
  commonTemplates: CommonTemplate[];
  isSyncing: boolean;
  isNewTxModalOpen: boolean;
  newTxInitialCategory?: string;
  openNewTxModal: (initialCategoryId?: string) => void;
  closeNewTxModal: () => void;
  isCrearPlanModalOpen: boolean;
  openCrearPlanModal: () => void;
  closeCrearPlanModal: () => void;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => Transaction;
  addCategory: (cat: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addGroup: (group: Omit<CategoryGroup, 'id'>) => CategoryGroup;
  updateGroup: (id: string, updates: Partial<CategoryGroup>) => void;
  deleteGroup: (id: string) => void;
  addTag: (tag: string) => void;
  deleteTag: (tag: string) => void;
  addCommonTemplate: (tmpl: Omit<CommonTemplate, 'id'>) => void;
  updateCommonTemplate: (id: string, updates: Partial<CommonTemplate>) => void;
  deleteCommonTemplate: (id: string) => void;
  executeCommonTemplate: (tmpl: CommonTemplate) => Transaction;
  backupData: () => string;
  restoreData: (jsonStr: string) => { success: boolean; message: string };
  deleteTransaction: (id: string) => void;
  transferBetweenAccounts: (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    note?: string
  ) => void;
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  payCreditCard: (cardId: string, fromAccountId: string, amount: number) => void;
  addGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  updateGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  contributeToGoal: (goalId: string, amount: number) => void;
  addBudget: (budget: Omit<Budget, 'id'>) => Budget;
  updateBudget: (id: string, updates: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  addDebt: (debt: Omit<DebtLoan, 'id'>) => void;
  payDebt: (debtId: string, amount: number) => void;
  addRecurring: (rec: Omit<RecurringPayment, 'id'>) => RecurringPayment;
  updateRecurring: (id: string, updates: Partial<RecurringPayment>) => void;
  deleteRecurring: (id: string) => void;
  toggleRecurringStatus: (id: string) => void;
  acceptRecurringSuggestion: (suggestion: RecurringSuggestion) => void;
  dismissRecurringSuggestion: (index: number) => void;
  syncWithBackend: () => Promise<void>;
  resetToDemoData: () => void;
  clearAllData: () => void;
}

const INITIAL_GOALS: SavingsGoal[] = [
  {
    id: 'goal_savings_main',
    title: 'Meta de Ahorro',
    targetAmount: 100000,
    currentAmount: 100,
    currency: 'DOP',
    deadlineDate: '2026-12-31',
    icon: 'wallet-outline',
    color: '#14B8A6',
    progressPercentage: 0,
    isRecurring: true,
  },
  {
    id: 'goal_services',
    title: 'Servicios',
    targetAmount: 4455,
    currentAmount: 0,
    currency: 'DOP',
    deadlineDate: '2026-10-31',
    icon: 'flash-outline',
    color: '#3B82F6',
    progressPercentage: 0,
    isRecurring: true,
  },
  {
    id: 'goal_car',
    title: 'Comprar vehículo nuevo',
    targetAmount: 1000000,
    currentAmount: 350000,
    currency: 'DOP',
    deadlineDate: '2027-12-31',
    icon: 'car-sport-outline',
    color: '#10B981',
    progressPercentage: 35,
    isRecurring: false,
  },
];

const INITIAL_DEBTS: DebtLoan[] = [
  {
    id: 'debt_loan',
    title: 'Préstamo Personal Banco',
    totalAmount: 250000,
    remainingAmount: 165000,
    monthlyPayment: 8500,
    dueDate: 'Día 10 de cada mes',
    creditor: 'Banco Popular',
    currency: 'DOP',
    paidPercentage: 34,
  },
];

const INITIAL_RECURRING: RecurringPayment[] = [
  {
    id: 'rec_hhh',
    title: 'Hhh',
    amount: 1,
    type: 'expense',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 30,
    nextDueDate: 'Mañana',
    categoryId: 'food',
    accountId: 'acc_cash',
    status: 'active',
  },
  {
    id: 'rec_titi',
    title: 'Titi',
    amount: 1000,
    type: 'expense',
    frequency: 'daily',
    interval: 1,
    nextDueDate: 'Mañana',
    categoryId: 'education',
    accountId: 'acc_bank_main',
    status: 'active',
  },
  {
    id: 'rec_ggg',
    title: 'Ggg',
    amount: 111,
    type: 'expense',
    frequency: 'daily',
    interval: 1,
    nextDueDate: 'Mañana',
    categoryId: 'food',
    accountId: 'acc_cash',
    status: 'active',
  },
  {
    id: 'rec_netflix',
    title: 'Netflix Premium',
    amount: 799,
    type: 'expense',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 22,
    nextDueDate: '22 de Oct.',
    categoryId: 'entertainment',
    accountId: 'acc_credit_card',
    status: 'active',
  },
  {
    id: 'rec_electricity',
    title: 'Factura Edeeste',
    amount: 1850,
    type: 'expense',
    frequency: 'monthly',
    interval: 1,
    dayOfMonth: 20,
    nextDueDate: '20 de Oct.',
    categoryId: 'home',
    accountId: 'acc_bank_main',
    status: 'active',
  },
];

const INITIAL_SUGGESTIONS: RecurringSuggestion[] = [
  {
    title: 'Netflix Familiar',
    amount: 799,
    frequency: 'monthly',
    message: 'Detectamos 2 pagos mensuales de RD$799.00 en Netflix.',
    sampleTx: INITIAL_TRANSACTIONS[5],
  },
];

const INITIAL_COMMON_TEMPLATES: CommonTemplate[] = [
  {
    id: 'tmpl_agua',
    name: 'Agua',
    amount: 200,
    type: 'expense',
    categoryId: 'food',
    emoji: '🧺',
    tags: ['#mercado'],
    notes: 'Botellón de agua o despensa',
  },
  {
    id: 'tmpl_1',
    name: 'Café mañanero',
    amount: 150,
    type: 'expense',
    categoryId: 'food',
    emoji: '☕',
  },
  {
    id: 'tmpl_2',
    name: 'Almuerzo de trabajo',
    amount: 380,
    type: 'expense',
    categoryId: 'food',
    emoji: '🍔',
  },
  {
    id: 'tmpl_3',
    name: 'Combustible regular',
    amount: 1500,
    type: 'expense',
    categoryId: 'transport',
    emoji: '⛽',
  },
  {
    id: 'tmpl_4',
    name: 'Supermercado exprés',
    amount: 2200,
    type: 'expense',
    categoryId: 'shopping',
    emoji: '🛒',
  },
  {
    id: 'tmpl_5',
    name: 'Pago Quincena',
    amount: 35000,
    type: 'income',
    categoryId: 'salary',
    emoji: '💼',
  },
];

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      accounts: INITIAL_ACCOUNTS,
      transactions: INITIAL_TRANSACTIONS,
      budgets: INITIAL_BUDGETS,
      categories: DEFAULT_CATEGORIES,
      categoryGroups: DEFAULT_CATEGORY_GROUPS,
      goals: INITIAL_GOALS,
      debts: INITIAL_DEBTS,
      recurring: INITIAL_RECURRING,
      recurringSuggestions: INITIAL_SUGGESTIONS,
      tags: ['#personal', '#trabajo', '#familia', '#urgente', '#viaje', '#salidas'],
      commonTemplates: INITIAL_COMMON_TEMPLATES,
      isSyncing: false,
      isNewTxModalOpen: false,
      newTxInitialCategory: undefined,
      isCrearPlanModalOpen: false,

      openNewTxModal: (initialCategoryId?: string) => {
        set({ isNewTxModalOpen: true, newTxInitialCategory: initialCategoryId });
      },

      closeNewTxModal: () => {
        set({ isNewTxModalOpen: false, newTxInitialCategory: undefined });
      },

      openCrearPlanModal: () => {
        set({ isCrearPlanModalOpen: true });
      },

      closeCrearPlanModal: () => {
        set({ isCrearPlanModalOpen: false });
      },

      addCategory: (catData) => {
        const newCat: Category = {
          ...catData,
          id: `cat_${Date.now()}`,
        };
        set((state) => ({ categories: [...state.categories, newCat] }));
        return newCat;
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCategory: (catId) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== catId),
        }));
      },

      addGroup: (groupData) => {
        const newGroup: CategoryGroup = {
          ...groupData,
          id: `grp_${Date.now()}`,
        };
        set((state) => ({
          categoryGroups: [...(state.categoryGroups || DEFAULT_CATEGORY_GROUPS), newGroup],
        }));
        return newGroup;
      },

      updateGroup: (id, updates) => {
        set((state) => ({
          categoryGroups: (state.categoryGroups || DEFAULT_CATEGORY_GROUPS).map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
      },

      deleteGroup: (id) => {
        set((state) => ({
          categoryGroups: (state.categoryGroups || DEFAULT_CATEGORY_GROUPS).filter((g) => g.id !== id),
          categories: state.categories.map((c) =>
            c.groupId === id ? { ...c, groupId: undefined } : c
          ),
        }));
      },

  addTag: (tag) => {
    const cleanTag = tag.trim().startsWith('#') ? tag.trim() : `#${tag.trim()}`;
    if (!cleanTag || cleanTag === '#') return;
    set((state) => {
      if (state.tags.includes(cleanTag)) return state;
      return { tags: [cleanTag, ...state.tags] };
    });
  },

  deleteTag: (tagToDelete) => {
    set((state) => ({
      tags: state.tags.filter((t) => t !== tagToDelete),
    }));
  },

  addCommonTemplate: (tmplData) => {
    const newTmpl: CommonTemplate = {
      ...tmplData,
      id: `tmpl_${Date.now()}`,
    };
    set((state) => ({ commonTemplates: [...state.commonTemplates, newTmpl] }));
  },

  updateCommonTemplate: (id, updates) => {
    set((state) => ({
      commonTemplates: state.commonTemplates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
  },

  deleteCommonTemplate: (tmplId) => {
    set((state) => ({
      commonTemplates: state.commonTemplates.filter((t) => t.id !== tmplId),
    }));
  },

  executeCommonTemplate: (tmpl) => {
    const { addTransaction, accounts } = get();
    return addTransaction({
      type: tmpl.type,
      amount: tmpl.amount,
      currency: 'DOP',
      categoryId: tmpl.categoryId,
      accountId: tmpl.accountId || accounts[0]?.id || 'acc_cash',
      description: tmpl.name,
      merchant: tmpl.name,
      date: new Date().toISOString().split('T')[0],
      tags: tmpl.tags && tmpl.tags.length > 0 ? tmpl.tags : ['#frecuente'],
      notes: tmpl.notes,
    });
  },

  backupData: () => {
    const { accounts, transactions, budgets, categories, goals, debts, recurring, tags, commonTemplates } = get();
    const exportPayload = {
      appName: 'Finanzas AI',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {
        accounts,
        transactions,
        budgets,
        categories,
        goals,
        debts,
        recurring,
        tags,
        commonTemplates,
      },
    };
    return JSON.stringify(exportPayload, null, 2);
  },

  restoreData: (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const data = parsed.data || parsed;
      if (!data.transactions && !data.categories) {
        return { success: false, message: 'El archivo no contiene un formato de respaldo válido de Finanzas AI.' };
      }
      set((state) => ({
        accounts: Array.isArray(data.accounts) ? data.accounts : state.accounts,
        transactions: Array.isArray(data.transactions) ? data.transactions : state.transactions,
        budgets: Array.isArray(data.budgets) ? data.budgets : state.budgets,
        categories: Array.isArray(data.categories) ? data.categories : state.categories,
        goals: Array.isArray(data.goals) ? data.goals : state.goals,
        debts: Array.isArray(data.debts) ? data.debts : state.debts,
        recurring: Array.isArray(data.recurring) ? data.recurring : state.recurring,
        tags: Array.isArray(data.tags) ? data.tags : state.tags,
        commonTemplates: Array.isArray(data.commonTemplates) ? data.commonTemplates : state.commonTemplates,
      }));
      return {
        success: true,
        message: `¡Respaldo restaurado con éxito! Se cargaron ${data.transactions?.length || 0} movimientos.`,
      };
    } catch (e: any) {
      return { success: false, message: 'Error al interpretar el JSON: ' + (e.message || 'Formato inválido') };
    }
  },

  addTransaction: (txData) => {
    const newId = `tx_${Date.now()}`;
    const defaultAccountId = txData.accountId || (get().accounts[0]?.id ?? 'acc_cash_main');
    const newTx: Transaction = {
      ...txData,
      id: newId,
      accountId: defaultAccountId,
      date: txData.date || new Date().toISOString().split('T')[0],
      time: txData.time || `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
    };

    set((state) => {
      const targetAccountId = newTx.accountId || (state.accounts[0]?.id ?? 'acc_cash_main');
      const updatedAccounts = state.accounts.map((acc) => {
        const isTarget = acc.id === targetAccountId || state.accounts.length === 1;
        if (newTx.type === 'expense' && isTarget) {
          if (acc.type === 'credit_card') {
            const used = (acc.balanceUsed || 0) + newTx.amount;
            return {
              ...acc,
              balanceUsed: used,
              balance: acc.balance - newTx.amount,
            };
          }
          return { ...acc, balance: acc.balance - newTx.amount };
        }

        if (newTx.type === 'income' && isTarget) {
          return { ...acc, balance: acc.balance + newTx.amount };
        }

        if (newTx.type === 'transfer') {
          if (acc.id === newTx.accountId) {
            return { ...acc, balance: acc.balance - newTx.amount };
          }
          if (acc.id === newTx.destinationAccountId) {
            return { ...acc, balance: acc.balance + newTx.amount };
          }
        }

        return acc;
      });

      // 2. Synchronize Goals if transaction is for savings
      const updatedGoals = state.goals.map((g) => {
        const isGoalMatch =
          newTx.goalId === g.id ||
          newTx.categoryId === g.id ||
          (newTx.categoryId === 'savings_goal' && (
            (newTx.subcategory && newTx.subcategory.toLowerCase() === g.title.toLowerCase()) ||
            (newTx.description && newTx.description.toLowerCase().includes(g.title.toLowerCase())) ||
            state.goals.length === 1 ||
            g.id === 'goal_savings_main' ||
            g.title.toLowerCase().includes('meta de ahorro')
          )) ||
          (newTx.description && newTx.description.toLowerCase().includes(g.title.toLowerCase())) ||
          (newTx.subcategory && newTx.subcategory.toLowerCase().includes(g.title.toLowerCase()));

        if (isGoalMatch) {
          const newCurrent = g.currentAmount + newTx.amount;
          return {
            ...g,
            currentAmount: newCurrent,
            progressPercentage: g.targetAmount > 0 ? Math.min(100, Math.round((newCurrent / g.targetAmount) * 100)) : 0,
          };
        }
        return g;
      });

      // 3. Synchronize Budgets if transaction is an expense for a budgeted category
      const updatedBudgets = state.budgets.map((b) => {
        const cat = state.categories.find((c) => c.id === b.categoryId);
        const isBudgetMatch =
          newTx.type === 'expense' &&
          (newTx.budgetId === b.id ||
           newTx.categoryId === b.categoryId ||
           newTx.categoryId === b.id ||
           (cat && newTx.categoryId === cat.id) ||
           (b.name && newTx.description && newTx.description.toLowerCase().includes(b.name.toLowerCase())) ||
           (b.name && newTx.subcategory && newTx.subcategory.toLowerCase().includes(b.name.toLowerCase())));

        if (isBudgetMatch) {
          const newSpent = (b.spent || 0) + newTx.amount;
          const remaining = Math.max(0, b.amount - newSpent);
          const percentage = b.amount > 0 ? Math.round((newSpent / b.amount) * 100) : 0;
          return {
            ...b,
            spent: newSpent,
            remaining,
            percentage,
          };
        }
        return b;
      });

      return {
        transactions: [newTx, ...state.transactions],
        accounts: updatedAccounts,
        goals: updatedGoals,
        budgets: updatedBudgets,
      };
    });

    // Trigger visual money effect & auto-scroll on Dashboard
    useUIStore.getState().triggerRegisteredTxEffect({
      id: newTx.id,
      type: newTx.type === 'income' ? 'income' : 'expense',
      amount: newTx.amount,
      currency: newTx.currency || 'DOP',
      description: newTx.merchant || newTx.description || (newTx.type === 'income' ? 'Ingreso' : 'Gasto'),
    });

    // Enviar a la API en segundo plano sin bloquear la UI
    apiClient.post('/transactions', newTx).catch(() => {});

    return newTx;
  },

  deleteTransaction: (id) => {
    set((state) => {
      const tx = state.transactions.find((t) => t.id === id);
      if (!tx) return state;

      const targetAccountId = tx.accountId || (state.accounts[0]?.id ?? 'acc_cash_main');
      const updatedAccounts = state.accounts.map((acc) => {
        const isTarget = acc.id === targetAccountId || state.accounts.length === 1;
        if (tx.type === 'expense' && isTarget) {
          if (acc.type === 'credit_card') {
            return {
              ...acc,
              balanceUsed: Math.max(0, (acc.balanceUsed || 0) - tx.amount),
              balance: acc.balance + tx.amount,
            };
          }
          return { ...acc, balance: acc.balance + tx.amount };
        }

        if (tx.type === 'income' && isTarget) {
          return { ...acc, balance: acc.balance - tx.amount };
        }

        if (tx.type === 'transfer') {
          if (acc.id === tx.accountId) {
            return { ...acc, balance: acc.balance + tx.amount };
          }
          if (acc.id === tx.destinationAccountId) {
            return { ...acc, balance: acc.balance - tx.amount };
          }
        }

        return acc;
      });

      // Revert Goals
      const updatedGoals = state.goals.map((g) => {
        const isGoalMatch =
          tx.goalId === g.id ||
          tx.categoryId === g.id ||
          (tx.categoryId === 'savings_goal' && (
            (tx.subcategory && tx.subcategory.toLowerCase() === g.title.toLowerCase()) ||
            (tx.description && tx.description.toLowerCase().includes(g.title.toLowerCase())) ||
            state.goals.length === 1 ||
            g.id === 'goal_savings_main' ||
            g.title.toLowerCase().includes('meta de ahorro')
          )) ||
          (tx.description && tx.description.toLowerCase().includes(g.title.toLowerCase())) ||
          (tx.subcategory && tx.subcategory.toLowerCase().includes(g.title.toLowerCase()));

        if (isGoalMatch) {
          const newCurrent = Math.max(0, g.currentAmount - tx.amount);
          return {
            ...g,
            currentAmount: newCurrent,
            progressPercentage: g.targetAmount > 0 ? Math.min(100, Math.round((newCurrent / g.targetAmount) * 100)) : 0,
          };
        }
        return g;
      });

      // Revert Budgets
      const updatedBudgets = state.budgets.map((b) => {
        const cat = state.categories.find((c) => c.id === b.categoryId);
        const isBudgetMatch =
          tx.type === 'expense' &&
          (tx.budgetId === b.id ||
           tx.categoryId === b.categoryId ||
           tx.categoryId === b.id ||
           (cat && tx.categoryId === cat.id) ||
           (b.name && tx.description && tx.description.toLowerCase().includes(b.name.toLowerCase())) ||
           (b.name && tx.subcategory && tx.subcategory.toLowerCase().includes(b.name.toLowerCase())));

        if (isBudgetMatch) {
          const newSpent = Math.max(0, (b.spent || 0) - tx.amount);
          const remaining = Math.max(0, b.amount - newSpent);
          const percentage = b.amount > 0 ? Math.round((newSpent / b.amount) * 100) : 0;
          return {
            ...b,
            spent: newSpent,
            remaining,
            percentage,
          };
        }
        return b;
      });

      return {
        transactions: state.transactions.filter((t) => t.id !== id),
        accounts: updatedAccounts,
        goals: updatedGoals,
        budgets: updatedBudgets,
      };
    });

    apiClient.delete(`/transactions/${id}`).catch(() => {});
  },

  transferBetweenAccounts: (fromAccountId, toAccountId, amount, note) => {
    const { addTransaction } = get();
    addTransaction({
      type: 'transfer',
      amount,
      currency: 'DOP',
      categoryId: 'transfer',
      accountId: fromAccountId,
      destinationAccountId: toAccountId,
      date: new Date().toISOString().split('T')[0],
      description: note || 'Transferencia entre cuentas',
      tags: ['#transferencia'],
    });

    apiClient.post('/accounts/transfer', { fromAccountId, toAccountId, amount, note }).catch(() => {});
  },

  addAccount: (accData) => {
    const newAcc: Account = {
      ...accData,
      id: `acc_${Date.now()}`,
    };
    set((state) => ({ accounts: [...state.accounts, newAcc] }));
    apiClient.post('/accounts', newAcc).catch(() => {});
  },

  updateAccount: (id, updates) => {
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    }));
    apiClient.put(`/accounts/${id}`, updates).catch(() => {});
  },

  deleteAccount: (id) => {
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    }));
    apiClient.delete(`/accounts/${id}`).catch(() => {});
  },

  payCreditCard: (cardId, fromAccountId, amount) => {
    const { addTransaction } = get();
    // Register the payment as a transfer reducing debt
    set((state) => ({
      accounts: state.accounts.map((a) => {
        if (a.id === fromAccountId) {
          return { ...a, balance: a.balance - amount };
        }
        if (a.id === cardId) {
          const newUsed = Math.max(0, (a.balanceUsed || 0) - amount);
          return { ...a, balanceUsed: newUsed, balance: a.balance + amount };
        }
        return a;
      }),
    }));

    addTransaction({
      type: 'transfer',
      amount,
      currency: 'DOP',
      categoryId: 'transfer',
      accountId: fromAccountId,
      destinationAccountId: cardId,
      date: new Date().toISOString().split('T')[0],
      description: 'Pago Tarjeta de Crédito',
      tags: ['#pago-tarjeta'],
    });

    apiClient.post(`/accounts/${cardId}/pay-card`, { fromAccountId, amount }).catch(() => {});
  },

  addGoal: (goalData) => {
    const state = get();
    const matchingTxs = state.transactions.filter((tx) => {
      const isDirect = tx.categoryId === 'savings_goal' || tx.categoryId === 'savings';
      const isTitleInDesc = goalData.title && tx.description && tx.description.toLowerCase().includes(goalData.title.toLowerCase());
      const isTitleInSub = goalData.title && tx.subcategory && tx.subcategory.toLowerCase() === goalData.title.toLowerCase();
      return (isDirect && (isTitleInDesc || isTitleInSub)) || isTitleInDesc || isTitleInSub;
    });
    const initialSaved = Math.max(goalData.currentAmount || 0, matchingTxs.reduce((sum, tx) => sum + tx.amount, 0));

    const newGoal: SavingsGoal = {
      ...goalData,
      id: `goal_${Date.now()}`,
      currentAmount: initialSaved,
      progressPercentage: goalData.targetAmount > 0 ? Math.min(100, Math.round((initialSaved / goalData.targetAmount) * 100)) : 0,
    };
    set((s) => ({ goals: [...s.goals, newGoal] }));
    apiClient.post('/goals', newGoal).catch(() => {});
  },

  contributeToGoal: (goalId, amount) => {
    const state = get();
    const goal = state.goals.find((g) => g.id === goalId);
    const goalTitle = goal?.title || 'Meta de Ahorro';
    const mainAccount = state.accounts[0]?.id || 'acc_cash';

    state.addTransaction({
      type: 'expense',
      amount,
      currency: 'DOP',
      categoryId: 'savings_goal',
      subcategory: goalTitle,
      goalId: goalId,
      accountId: mainAccount,
      date: new Date().toISOString().split('T')[0],
      description: `Aporte a meta: ${goalTitle}`,
      tags: ['#ahorro'],
    });

    apiClient.post(`/goals/${goalId}/contribute`, { amount }).catch(() => {});
  },

  updateGoal: (id, updates) => {
    set((state) => ({
      goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
    }));
  },

  deleteGoal: (id) => {
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
  },

  addBudget: (budgetData) => {
    const state = get();
    const cat = state.categories.find((c) => c.id === budgetData.categoryId);
    const catTxs = state.transactions.filter(
      (tx) => tx.type === 'expense' && (
        tx.categoryId === budgetData.categoryId ||
        (cat && tx.categoryId === cat.id) ||
        (budgetData.name && tx.description && tx.description.toLowerCase().includes(budgetData.name.toLowerCase())) ||
        (budgetData.name && tx.subcategory && tx.subcategory.toLowerCase().includes(budgetData.name.toLowerCase()))
      )
    );
    const initialSpent = catTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const newBudget: Budget = {
      ...budgetData,
      id: `bg_${Date.now()}`,
      spent: initialSpent,
      remaining: Math.max(0, budgetData.amount - initialSpent),
      percentage: budgetData.amount > 0 ? Math.round((initialSpent / budgetData.amount) * 100) : 0,
    };
    set((s) => ({ budgets: [...s.budgets, newBudget] }));
    return newBudget;
  },

  updateBudget: (id, updates) => {
    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
  },

  deleteBudget: (id) => {
    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
    }));
  },

  addDebt: (debtData) => {
    const newDebt: DebtLoan = {
      ...debtData,
      id: `debt_${Date.now()}`,
      paidPercentage: Math.round(((debtData.totalAmount - debtData.remainingAmount) / debtData.totalAmount) * 100),
    };
    set((state) => ({ debts: [...state.debts, newDebt] }));
    apiClient.post('/debts', newDebt).catch(() => {});
  },

  payDebt: (debtId, amount) => {
    set((state) => ({
      debts: state.debts.map((d) => {
        if (d.id === debtId) {
          const updatedRem = Math.max(0, d.remainingAmount - amount);
          return {
            ...d,
            remainingAmount: updatedRem,
            paidPercentage: Math.round(((d.totalAmount - updatedRem) / d.totalAmount) * 100),
          };
        }
        return d;
      }),
    }));
    apiClient.post(`/debts/${debtId}/pay`, { paymentAmount: amount }).catch(() => {});
  },

  addRecurring: (recData) => {
    const newRec: RecurringPayment = {
      ...recData,
      status: recData.status || 'active',
      type: recData.type || 'expense',
      id: `rec_${Date.now()}`,
    };
    set((state) => ({ recurring: [...state.recurring, newRec] }));
    return newRec;
  },

  updateRecurring: (id, updates) => {
    set((state) => ({
      recurring: state.recurring.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }));
  },

  deleteRecurring: (id) => {
    set((state) => ({
      recurring: state.recurring.filter((r) => r.id !== id),
    }));
  },

  toggleRecurringStatus: (id) => {
    set((state) => ({
      recurring: state.recurring.map((r) =>
        r.id === id
          ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' }
          : r
      ),
    }));
  },

  acceptRecurringSuggestion: (suggestion) => {
    const { addRecurring } = get();
    addRecurring({
      title: suggestion.title,
      amount: suggestion.amount,
      frequency: 'monthly',
      interval: 1,
      type: 'expense',
      status: 'active',
      nextDueDate: 'Próximo mes',
      categoryId: suggestion.sampleTx.categoryId || 'entertainment',
      accountId: suggestion.sampleTx.accountId || 'acc_credit_card',
    });
    set((state) => ({
      recurringSuggestions: state.recurringSuggestions.filter((s) => s.title !== suggestion.title),
    }));
  },

  dismissRecurringSuggestion: (index) => {
    set((state) => ({
      recurringSuggestions: state.recurringSuggestions.filter((_, i) => i !== index),
    }));
  },

  syncWithBackend: async () => {
    set({ isSyncing: true });
    try {
      const { transactions } = get();
      const res = await apiClient.post<{ serverTransactions: Transaction[] }>('/transactions/sync', {
        localTransactions: transactions,
      });
      if (res.success && res.data?.serverTransactions) {
        set({ transactions: res.data.serverTransactions });
      }
    } catch (e) {
      console.log('Sync offline fallback');
    } finally {
      set({ isSyncing: false });
    }
  },

  resetToDemoData: () => {
    set({
      accounts: INITIAL_ACCOUNTS,
      transactions: INITIAL_TRANSACTIONS,
      budgets: INITIAL_BUDGETS,
      categories: DEFAULT_CATEGORIES,
      categoryGroups: DEFAULT_CATEGORY_GROUPS,
      goals: INITIAL_GOALS,
      debts: INITIAL_DEBTS,
      recurring: INITIAL_RECURRING,
      recurringSuggestions: INITIAL_SUGGESTIONS,
      tags: ['#personal', '#trabajo', '#familia', '#urgente', '#viaje', '#salidas'],
      commonTemplates: INITIAL_COMMON_TEMPLATES,
    });
  },

  clearAllData: () => {
    set({
      accounts: [
        {
          id: 'acc_cash_main',
          name: 'Efectivo',
          type: 'cash',
          balance: 0,
          currency: 'DOP',
          color: '#10B981',
          icon: 'cash-outline',
        },
      ],
      transactions: [],
      budgets: [],
      categories: DEFAULT_CATEGORIES,
      categoryGroups: DEFAULT_CATEGORY_GROUPS,
      goals: [],
      debts: [],
      recurring: [],
      recurringSuggestions: [],
      tags: ['#personal', '#trabajo'],
      commonTemplates: [],
    });
  },
    }),
    {
      name: 'finanzas_ai_finance_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accounts: state.accounts,
        transactions: state.transactions,
        budgets: state.budgets,
        categories: state.categories,
        categoryGroups: state.categoryGroups,
        goals: state.goals,
        debts: state.debts,
        recurring: state.recurring,
        tags: state.tags,
        commonTemplates: state.commonTemplates,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.categoryGroups || state.categoryGroups.length === 0) {
            state.categoryGroups = DEFAULT_CATEGORY_GROUPS;
          }
          if (state.categories && state.categories.length > 0) {
            const defaultMap = new Map(DEFAULT_CATEGORIES.map((c) => [c.id, c.groupId]));
            // Also merge any new default categories that might not be in state.categories
            const existingIds = new Set(state.categories.map((c) => c.id));
            const missingDefaults = DEFAULT_CATEGORIES.filter((c) => !existingIds.has(c.id));

            state.categories = [
              ...state.categories.map((c) => {
                if (!c.groupId && defaultMap.has(c.id)) {
                  return { ...c, groupId: defaultMap.get(c.id) };
                }
                return c;
              }),
              ...missingDefaults,
            ];
          }

          if (state.recurring === undefined) {
            state.recurring = INITIAL_RECURRING;
          } else if (state.recurring && state.recurring.length > 0) {
            const existingRecIds = new Set(state.recurring.map((r) => r.id));
            const missingInitial = INITIAL_RECURRING.filter((r) => !existingRecIds.has(r.id));
            state.recurring = [
              ...state.recurring.map((r) => ({
                ...r,
                status: r.status || 'active',
                type: r.type || 'expense',
              })),
            ];
          }

          if (state.commonTemplates === undefined) {
            state.commonTemplates = INITIAL_COMMON_TEMPLATES;
          }
        }
      },
    }
  )
);
