/**
 * `EdgeClassLegend` — the palette-synced edge-class legend.
 *
 * One chip per edge class present in the family, coloured from
 * `EDGE_CLASS_COLORS` so an edge class has a single identity site-wide
 * (DESIGN.md §3.9). Toggling a chip changes `selected`, which is what makes
 * connection dots appear/disappear on every tile and tiling at once.
 *
 * With `onStrands`, a selected chip also carries how many strands cross each
 * seam of its class: ▲ / ▼ beside it (or the arrow keys on the chip) step it
 * from 1 to `maxStrands`, ▼ at 1 turns the class off, and the chip shows ×N
 * once there is more than one.
 */

import { familyMajors, type TileFamilyId } from '../../core';
import { edgeClassColor, edgeClassLabel } from '../../lib/palette';

export interface EdgeClassLegendProps {
  readonly family: TileFamilyId;
  readonly selected: ReadonlySet<number>;
  /** Externally driven emphasis (hover sync from a palette). */
  readonly highlight?: ReadonlySet<number>;
  onToggle?(major: number): void;
  onHover?(major: number | null): void;
  /** Per-class dot counts, e.g. "3 dots" tooltips. */
  readonly counts?: Readonly<Record<number, number>>;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly legend?: string;
  /** Strands per seam of each class (default 1). */
  readonly strands?: Readonly<Record<number, number>>;
  /** Set a class's strand count; omit to hide the steppers. */
  onStrands?(major: number, count: number): void;
  readonly maxStrands?: number;
}

export function EdgeClassLegend(props: EdgeClassLegendProps): JSX.Element {
  const {
    family,
    selected,
    highlight,
    onToggle,
    onHover,
    counts,
    disabled,
    className,
    legend,
    strands,
    onStrands,
    maxStrands = 3,
  } = props;
  const majors = familyMajors(family);

  return (
    <fieldset
      className={['edge-legend', className ?? ''].filter(Boolean).join(' ')}
      disabled={disabled}
    >
      {legend ? <legend>{legend}</legend> : null}
      <div className="edge-legend-chips" role="group" aria-label="Edge classes">
        {majors.map((major) => {
          const on = selected.has(major);
          const n = strands?.[major] ?? 1;
          const stepper = !!onStrands && on;
          const step = (d: 1 | -1) => {
            if (!onStrands) return;
            if (d < 0 && n <= 1) onToggle?.(major);
            else onStrands(major, Math.max(1, Math.min(maxStrands, n + d)));
          };
          const chip = (
            <button
              key={major}
              type="button"
              className={[
                'edge-chip',
                on ? 'is-on' : '',
                highlight?.has(major) ? 'is-highlighted' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-major={major}
              aria-pressed={on}
              title={
                stepper
                  ? `Class ${major}: ${n} strand${n === 1 ? '' : 's'} per edge. Up and down arrows change it.`
                  : counts?.[major] != null
                    ? `Class ${major} — ${counts[major]} connection points`
                    : `Edge class ${major}`
              }
              onClick={() => onToggle?.(major)}
              onKeyDown={(e) => {
                if (!stepper || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
                e.preventDefault();
                step(e.key === 'ArrowUp' ? 1 : -1);
              }}
              onPointerEnter={() => onHover?.(major)}
              onPointerLeave={() => onHover?.(null)}
            >
              <span className="edge-chip-swatch" style={{ background: edgeClassColor(major) }} />
              <span className="edge-chip-label">{edgeClassLabel(major)}</span>
              {stepper && n > 1 ? (
                <span className="edge-chip-count" data-testid={`strand-count-${major}`}>
                  ×{n}
                </span>
              ) : null}
            </button>
          );
          if (!stepper) return chip;
          return (
            <span key={major} className="edge-chip-group">
              {chip}
              <span className="edge-chip-steps">
                <button
                  type="button"
                  aria-label={`More strands on class ${major}`}
                  disabled={n >= maxStrands}
                  onClick={() => step(1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={n <= 1 ? `Turn class ${major} off` : `Fewer strands on class ${major}`}
                  onClick={() => step(-1)}
                >
                  ▼
                </button>
              </span>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

export default EdgeClassLegend;
