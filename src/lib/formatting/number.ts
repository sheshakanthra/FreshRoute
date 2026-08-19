const QUANTITY_FORMATTER = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatKg(value: number): string {
  return `${QUANTITY_FORMATTER.format(Math.round(value))} kg`;
}

export function formatHours(value: number): string {
  return `${value.toFixed(1)}h`;
}
