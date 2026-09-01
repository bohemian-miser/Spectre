/**
 * `DisplayToggles` — maps 1:1 to the `flags` bitmask (DESIGN.md §9.2 `fl`),
 * so what the user sees and what a shared URL carries can never drift.
 */

import { FLAG } from '../../core';

export interface DisplayTogglesProps {
  readonly flags: number;
  onToggle(flag: number): void;
  /** Hide toggles that do not apply (e.g. `curvy` outside the spectre family). */
  readonly hidden?: readonly number[];
  readonly className?: string;
}

const ITEMS: readonly { flag: number; label: string }[] = [
  { flag: FLAG.BACKGROUNDS, label: 'Backgrounds' },
  { flag: FLAG.OUTLINES, label: 'Outlines' },
  { flag: FLAG.LINES, label: 'Circuit lines' },
  { flag: FLAG.DOTS, label: 'Connection dots' },
  { flag: FLAG.RAINBOW_TAILS, label: 'Rainbow wanderers' },
  { flag: FLAG.EDGE_LABELS, label: 'Edge labels' },
  { flag: FLAG.CURVY, label: 'Curvy tiles' },
  { flag: FLAG.NON_CROSSING_ONLY, label: 'Non-crossing only' },
  { flag: FLAG.HIDE_STATS, label: 'Hide stats' },
];

export function DisplayToggles(props: DisplayTogglesProps): JSX.Element {
  const { flags, onToggle, hidden, className } = props;
  const skip = new Set(hidden ?? []);
  return (
    <fieldset className={['display-toggles', className ?? ''].filter(Boolean).join(' ')}>
      <legend>Display</legend>
      {ITEMS.filter((i) => !skip.has(i.flag)).map((item) => (
        <label key={item.flag} className="toggle-row">
          <input
            type="checkbox"
            checked={(flags & item.flag) !== 0}
            onChange={() => onToggle(item.flag)}
          />
          {item.label}
        </label>
      ))}
    </fieldset>
  );
}

export default DisplayToggles;
