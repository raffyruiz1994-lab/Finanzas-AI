import { Category, TransactionType } from '@/types';

export interface ParsedTransactionResult {
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: string;
  subcategory?: string;
  accountHint?: 'bank' | 'cash' | 'credit_card';
  description: string;
  merchant?: string;
  confidence: number; // 0 to 1
  rawInput: string;
}

export interface FinancialAssistantQuestion {
  question: string;
  userContext: {
    totalBalance: number;
    safeToSpend: number;
    monthlyExpenses: number;
    monthlyIncome: number;
    categoriesSpent: Record<string, number>;
  };
}

export interface FinancialAssistantResponse {
  answer: string;
  suggestedActions?: string[];
  relevantDataPoints?: Record<string, any>;
}

export interface IAIService {
  providerName: string;
  parseNaturalLanguageTransaction(
    text: string,
    categories: Category[]
  ): Promise<ParsedTransactionResult>;
  askFinancialAssistant(
    request: FinancialAssistantQuestion
  ): Promise<FinancialAssistantResponse>;
}

