import { CurrencyCode, CURRENCIES } from '@/types';

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = 'DOP',
  isPrivacyHidden: boolean = false
): string {
  if (isPrivacyHidden) {
    const symbol = CURRENCIES[currencyCode]?.symbol || 'RD$';
    return `${symbol} ••••••`;
  }

  const symbol = CURRENCIES[currencyCode]?.symbol || 'RD$';
  const absAmount = Math.abs(amount);

  // Formato estándar con separadores de miles y 2 decimales
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (amount < 0) {
    return `-${symbol}${formattedNumber}`;
  }

  return `${symbol}${formattedNumber}`;
}

export function formatCurrencySigned(
  amount: number,
  type: 'income' | 'expense' | 'transfer',
  currencyCode: CurrencyCode = 'DOP',
  isPrivacyHidden: boolean = false
): string {
  if (isPrivacyHidden) {
    return type === 'income' ? '+ ••••••' : type === 'expense' ? '- ••••••' : '••••••';
  }

  const symbol = CURRENCIES[currencyCode]?.symbol || 'RD$';
  const absAmount = Math.abs(amount);
  const formattedNumber = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (type === 'income') {
    return `+${symbol}${formattedNumber}`;
  }
  if (type === 'expense') {
    return `-${symbol}${formattedNumber}`;
  }
  return `${symbol}${formattedNumber}`;
}

