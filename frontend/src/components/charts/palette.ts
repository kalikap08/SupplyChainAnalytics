// Fixed categorical order — validated for CVD-safe adjacent contrast.
// Assign by position (never cycle/reorder) so a series keeps its color
// across re-sorts and filters.
export const CHART_PALETTE = [
  "#2563EB", // blue
  "#0D9488", // teal
  "#B45309", // amber
  "#7C3AED", // violet
  "#BE123C", // rose
  "#0891B2", // cyan
] as const;

export const CHART_OTHER_COLOR = "#94A3B8"; // slate — reserved for the folded "Other" bucket

export function colorForIndex(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
