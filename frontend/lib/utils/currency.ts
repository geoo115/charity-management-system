export function formatCurrency(amount: number, currency: string = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function parseCurrency(value: string): number {
  // Remove currency symbols and parse as float
  const cleanValue = value.replace(/[£$€,\s]/g, '');
  return parseFloat(cleanValue) || 0;
}

export function formatCurrencyCompact(amount: number, currency: string = 'GBP'): string {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount, currency);
}
