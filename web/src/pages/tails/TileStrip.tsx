/**
 * `TileStrip` — the cast list: all ten tile types under one rule, each with its
 * crossing count and an odd/even verdict.
 *
 * Used by the rule lab at the top of the article and reusable anywhere the
 * page needs to show *who* a rule upsets. With `live` on, every physical edge
 * wears its major-class number (faint until the class is selected), selected
 * seams grow their crossing dot and stroke, pairs join up and odd tiles leave
 * a tail hanging — the article's whole game in one row of tiles.
 */

import { TilePalette, type EdgeRef } from '../../components';
import { MATRIX_ROWS, crossingCount } from './presets';
import { FAMILY } from './presets';

export interface TileStripProps {
  readonly selected: ReadonlySet<number>;
  /** Classes to glow, e.g. the column the reader is hovering in the matrix. */
  readonly highlightMajors?: ReadonlySet<number>;
  readonly tileSize?: number;
  /** Pulse the tiles that can never pair up. */
  readonly markOdd?: boolean;
  /** Major numbers on every edge, strokes for the rule, tails left hanging. */
  readonly live?: boolean;
  /** Clicking an edge (or its faint number's seam) toggles that class. */
  onToggleMajor?(major: number): void;
  onHoverMajor?(major: number | null): void;
  readonly className?: string;
}

export function TileStrip(props: TileStripProps): JSX.Element {
  const {
    selected,
    highlightMajors,
    tileSize = 96,
    markOdd = true,
    live = false,
    onToggleMajor,
    onHoverMajor,
    className,
  } = props;

  return (
    <TilePalette
      className={['tails-strip', className ?? ''].filter(Boolean).join(' ')}
      family={FAMILY}
      tileTypes={MATRIX_ROWS}
      tileSize={tileSize}
      selectedEdges={selected}
      highlightMajors={highlightMajors}
      showMajorNumbers={live}
      hangTails={live}
      markOdd={markOdd}
      interaction={onToggleMajor ? 'edge-select' : 'none'}
      onEdgeToggle={onToggleMajor}
      onEdgeHover={onHoverMajor ? (edge: EdgeRef | null) => onHoverMajor(edge?.major ?? null) : undefined}
      perTileFooter={(type) => {
        const n = crossingCount(type, selected);
        const odd = n % 2 === 1;
        return (
          <span
            className={['tails-parity', odd ? 'is-odd' : 'is-even'].join(' ')}
            data-tile-type={type}
            data-crossings={n}
          >
            {n} {n === 1 ? 'crossing' : 'crossings'} · {odd ? 'odd' : 'even'}
          </span>
        );
      }}
    />
  );
}

export default TileStrip;
