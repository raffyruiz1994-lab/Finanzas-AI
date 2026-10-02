export type CurrencyCode = 'DOP' | 'USD' | 'EUR' | 'GBP' | 'MXN';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Peso Dominicano', flag: '🇩🇴' },
  USD: { code: 'USD', symbol: '$', name: 'Dólar Estadounidense', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'Libra Esterlina', flag: '🇬🇧' },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Peso Mexicano', flag: '🇲🇽' },
};

export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'cash' | 'bank' | 'savings' | 'credit_card' | 'wallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: CurrencyCode;
  color: string;
  icon: string;
  // Credit card specific fields
  creditLimit?: number;
  balanceUsed?: number;
  billingClosingDay?: number; // Día de corte (ej. 15)
  paymentDueDay?: number; // Día de pago (ej. 28)
  bankName?: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  subcategories: string[];
  groupId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  categoryId: string;
  subcategory?: string;
  accountId?: string;
  destinationAccountId?: string; // Para tipo 'transfer'
  goalId?: string;
  budgetId?: string;
  date: string; // Formato YYYY-MM-DD
  time?: string; // Formato HH:mm
  description: string;
  notes?: string;
  tags?: string[];
  merchant?: string;
  receiptUrl?: string;
  isRecurring?: boolean;
  paymentMethod?: string;
}

export interface Budget {
  id: string;
  name?: string;
  categoryId: string;
  amount: number;
  period: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  alertThreshold: number; // 0.8, 0.9, 1.0
  spent?: number;
  remaining?: number;
  percentage?: number;
  alertLevel?: 'normal' | 'warning_medium' | 'warning_high' | 'danger';
  isRecurring?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: CurrencyCode;
  deadlineDate?: string;
  icon: string;
  color: string;
  progressPercentage?: number;
  isRecurring?: boolean;
  categoryId?: string;
  period?: string;
}

export interface DebtLoan {
  id: string;
  title: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  dueDate: string;
  creditor: string;
  currency: CurrencyCode;
  paidPercentage?: number;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringPayment {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  frequency: RecurringFrequency;
  interval?: number; // Cada cuánto (ej: 1)
  dayOfMonth?: number; // Día del mes (ej: 30)
  dayOfWeek?: number; // 0-6
  nextDueDate: string; // ej: "Mañana", "22 de Oct."
  categoryId: string;
  accountId?: string;
  status: 'active' | 'inactive';
  hasEndDate?: boolean;
  endDate?: string;
  lastAppliedDate?: string;
}

export interface RecurringSuggestion {
  title: string;
  amount: number;
  frequency: string;
  message: string;
  sampleTx: Transaction;
}

export interface SafeToSpendBreakdown {
  availableCash: number;
  totalIncomeMonth: number;
  totalExpenseMonth: number;
  upcomingBills: number;
  committedBudgets: number;
  allocatedSavings: number;
  safeToSpendTotal: number;
  dailySafeAmount: number;
  daysRemainingInPeriod: number;
  periodLabel: string;
}

export interface QuickInsight {
  dailyAverageExpense: number;
  topCategoryName: string;
  topCategoryAmount: number;
  topCategoryIcon: string;
  topSpendingDay: string;
  previousPeriodComparisonPercent: number | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
  isPro: boolean;
  avatarUrl?: string;
}

export interface PresetExpense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  icon: string;
  color: string;
}
