const IQD_LABEL_AR = 'دينار عراقي';

const decimalNumberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function toSafeNumber(value: number | string | null | undefined): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatIQD(value: number | string | null | undefined): string {
  const amount = toSafeNumber(value);
  return `${decimalNumberFormatter.format(amount)} ${IQD_LABEL_AR}`;
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  const normalizedCurrency = (currency || 'IQD').toUpperCase();

  if (normalizedCurrency === 'IQD') {
    return formatIQD(value);
  }

  const amount = toSafeNumber(value);
  return `${decimalNumberFormatter.format(amount)} ${normalizedCurrency}`;
}
