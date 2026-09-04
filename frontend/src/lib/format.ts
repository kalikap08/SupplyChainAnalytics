/**
 * Formats a value as Indian Rupees using Indian digit grouping
 * (lakh/crore), e.g. 2612289589 -> "₹2,61,22,89,589".
 * No decimals — these are whole-rupee KPI figures.
 */
export function formatINR(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
  return `₹${formatted}`;
}

/**
 * Formats a value as Indian Rupees using lakh/crore abbreviations,
 * e.g. 26122895 -> "₹2.6Cr", 500000 -> "₹5L". For tight spaces like
 * chart axis ticks, where the full formatINR string would get clipped.
 */
export function formatINRCompact(value: number): string {
  const formatted = new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 1,
  }).format(value);
  return `₹${formatted}`;
}

/**
 * Formats a plain count/quantity with standard thousands separators,
 * e.g. 1267078 -> "1,267,078".
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formats a percentage value (already 0-100) to two decimal places,
 * e.g. 95.71 -> "95.71%".
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Formats a Date as a readable "last updated" timestamp.
 */
export function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
