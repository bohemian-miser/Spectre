/**
 * `EdgeClassLegend` — the palette-synced edge-class legend.
 *
 * One chip per edge class present in the family, coloured from
 * `EDGE_CLASS_COLORS` so an edge class has a single identity site-wide
 * (DESIGN.md §3.9). Toggling a chip changes `selected`, which is what makes
 * connection dots appear/disappear on every tile and tiling at once.
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
}

export function EdgeClassLegend(props: EdgeClassLegendProps): JSX.Element {
  const { family, selected, highlight, onToggle, onHover, counts, disabled, className, legend } =
    props;
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
          return (
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
                counts?.[major] != null
                  ? `Class ${major} — ${counts[major]} connection points`
                  : `Edge class ${major}`
              }
              onClick={() => onToggle?.(major)}
              onPointerEnter={() => onHover?.(major)}
              onPointerLeave={() => onHover?.(null)}
            >
              <span className="edge-chip-swatch" style={{ background: edgeClassColor(major) }} />
              <span className="edge-chip-label">{edgeClassLabel(major)}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default EdgeClassLegend;
