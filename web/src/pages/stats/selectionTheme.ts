/**
 * One colour per edge selection, shared by the chips, the charts and the
 * detail panel so a family keeps its identity across the whole page.
 *
 * The values live in `styles/stats.css` as custom properties (with light-mode
 * overrides), and are referenced here as `var(--stats-sel-…, fallback)` so a
 * chart is always readable even if the stylesheet has not loaded yet.
 */

/** Canonical order: the six selections that have rows, largest family first. */
export const SELECTION_ORDER: readonly string[] = ['023678', '2578', '1278', '0356', '15', '0136'];

const FALLBACKS: Readonly<Record<string, string>> = {
  '023678': '#6ea8fe',
  '2578': '#68c98a',
  '1278': '#e0a33c',
  '0356': '#b58cf0',
  '15': '#ef7d92',
  '0136': '#41bfd0',
};

const SPARE = '#8b95a6';

export function selectionColor(selection: string): string {
  const fallback = FALLBACKS[selection];
  return fallback ? `var(--stats-sel-${selection}, ${fallback})` : SPARE;
}

/** Human label for an edge selection: `023678` reads as its digit list. */
export function selectionLabel(selection: string): string {
  return selection === '' ? '∅ (no seams)' : selection;
}

/** Selections in canonical order first, then anything unexpected, appended. */
export function orderSelections(selections: readonly string[]): readonly string[] {
  const known = SELECTION_ORDER.filter((s) => selections.includes(s));
  const rest = selections.filter((s) => !SELECTION_ORDER.includes(s));
  return [...known, ...rest];
}
