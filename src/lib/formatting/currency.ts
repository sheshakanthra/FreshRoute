const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

/** Renders an indicative rupee figure, e.g. 24827.82 -> "₹24,828". Never labelled as a live/measured value. */
export function formatIndicativeInr(value: number): string {
  return `₹${INR_FORMATTER.format(Math.round(value))}`;
}

export function formatSignedIndicativeInr(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatIndicativeInr(Math.abs(value))}`;
}
