const IQD_CURRENCY_LABEL = "دينار عراقي";

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function formatIQD(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${IQD_CURRENCY_LABEL}`;
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string,
): string {
  if (!currency || currency.toUpperCase() === "IQD") {
    return formatIQD(value);
  }

  const amount = toNumber(value);
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} ${currency}`;
}
