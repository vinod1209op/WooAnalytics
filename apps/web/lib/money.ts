/**
 * Format a number as a money string.
 * Default: USD, en-US → "$12,345.67"
 */
export function fmtMoney(
  value: number | null | undefined,
  options?: {
    currency?: string;
    locale?: string;
    maximumFractionDigits?: number;
  }
): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    maximumFractionDigits = 2,
  } = options || {};

  if (value == null || Number.isNaN(value)) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits,
    }).format(0);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value);
}