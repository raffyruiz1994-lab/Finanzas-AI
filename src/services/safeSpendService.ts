import { Account, Budget, SafeToSpendBreakdown, Transaction } from '@/types';

export function calculateSafeToSpend(
  accounts: Account[] | undefined,
  transactions: Transaction[],
  budgets: Budget[],
  targetDate: Date = new Date(2026, 8, 28) // Septiembre 2026 como en referencia
): SafeToSpendBreakdown {
  // 1. Ingresos y gastos del mes actual (ej. 2026-09)
  const currentMonthYear = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  
  const monthTransactions = transactions.filter((tx) =>
    tx.date.startsWith(currentMonthYear)
  );

  const totalIncomeMonth = monthTransactions
    .filter((tx) => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalExpenseMonth = monthTransactions
    .filter((tx) => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0);

  // 2. Dinero disponible neto = Ingresos acumulados - Gastos acumulados
  const availableCash = Math.max(0, totalIncomeMonth - totalExpenseMonth);

  // 3. Compromisos futuros estimados (Próximas facturas y pagos programados)
  const upcomingBills = 15000;
  
  // 4. Fondos asignados a ahorro
  const allocatedSavings = 0;

  // 5. Presupuestos comprometidos
  const totalCommittedBudgets = budgets.reduce((acc, b) => acc + b.amount, 0);
  const remainingBudgetCommitted = Math.max(0, totalCommittedBudgets - totalExpenseMonth);

  // 6. Cálculo del "Seguro para Gastar"
  const calculatedSafe = availableCash - upcomingBills;
  const safeToSpendTotal = Math.max(0, calculatedSafe);

  // 7. Días restantes en el mes (2 días en el demo 28 al 30 de sept)
  const daysInMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
  const currentDay = targetDate.getDate();
  const daysRemainingInPeriod = Math.max(1, daysInMonth - currentDay);

  const dailySafeAmount = Math.round((safeToSpendTotal / daysRemainingInPeriod) * 100) / 100;

  return {
    availableCash,
    totalIncomeMonth,
    totalExpenseMonth,
    upcomingBills,
    committedBudgets: remainingBudgetCommitted,
    allocatedSavings,
    safeToSpendTotal,
    dailySafeAmount,
    daysRemainingInPeriod,
    periodLabel: 'Septiembre 2026',
  };
}
