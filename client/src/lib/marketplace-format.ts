export function formatNaira(amount: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function perUnitLabel(unit: string): string {
  return unit.trim() ? `per ${unit.trim()}` : "per unit";
}

export function currencyFromMinor(amountMinor: number): string {
  return formatNaira(amountMinor / 100);
}
