/**
 * `TileStrip` — the cast list: all ten tile types under one rule, each with its
 * crossing count and an odd/even verdict.
 *
 * Used by the matrix explorer (as the copy's "filmstrip of all ten tile types")
 * and reusable anywhere the article needs to show *who* a rule upsets.
 */

import { TilePalette } from '../../components';
import { MATRIX_ROWS, crossingCount } from './presets';
import { FAMILY } from './presets';

export interface TileStripProps {
  readonly selected: ReadonlySet<number>;
  /** Classes to glow, e.g. the column the reader is hovering in the matrix. */
  readonly highlightMajors?: ReadonlySet<number>;
  readonly tileSize?: number;
  /** Pulse the tiles that can never pair up. */
  readonly markOdd?: boolean;
  readonly className?: string;
}

export function TileStrip(props: TileStripProps): JSX.Element {
  const { selected, highlightMajors, tileSize = 96, markOdd = true, className } = props;

  return (
    <TilePalette
      className={['tails-strip', className ?? ''].filter(Boolean).join(' ')}
      family={FAMILY}
      tileTypes={MATRIX_ROWS}
      tileSize={tileSize}
      selectedEdges={selected}
      highlightMajors={highlightMajors}
      markOdd={markOdd}
      interaction="none"
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
