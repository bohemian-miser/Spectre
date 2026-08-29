/**
 * `TraceTicker` — the tiles a chase is crossing, named and in their own
 * colours, along the bottom of the infinite viewport.
 *
 * The rainbow line says where the strand went; it says nothing about what it
 * went THROUGH. A strand crossing Delta, Delta, Psi, Gamma2 is a fact about
 * the substitution, and it is the fact the line hides. So the ticker names
 * each tile as the walk leaves it, newest at the right, in the same colour
 * that tile is drawn on screen.
 *
 * It renders the walk's bounded recent-tile ring, so it costs the same
 * whether the chase is twelve tiles long or twelve million.
 */

import { LEAF_ORDER } from '../../core';

export interface TraceTickerProps {
  /** Recent steps' leaf-type indices, oldest first (`recentTiles`). */
  readonly tiles: readonly number[];
  /** CSS colour per leaf type, in `LEAF_ORDER` — the tiles' own palette. */
  readonly colors: readonly string[];
  /** Most names to show; the rest of the ring is off the left edge. */
  readonly limit?: number;
  readonly className?: string;
}

export const DEFAULT_TICKER_LIMIT = 48;

export function TraceTicker(props: TraceTickerProps): JSX.Element | null {
  const { tiles, colors, limit = DEFAULT_TICKER_LIMIT, className } = props;
  if (tiles.length === 0) return null;
  const shown = tiles.slice(-Math.max(1, limit));

  return (
    <div
      className={['trace-ticker', className ?? ''].filter(Boolean).join(' ')}
      data-testid="trace-ticker"
      role="log"
      aria-live="off"
      aria-label="Tiles the traced strand has crossed"
    >
      {shown.map((type, i) => {
        const name = LEAF_ORDER[type] ?? '?';
        return (
          <span
            key={`${i}-${type}`}
            className={i === shown.length - 1 ? 'trace-tile is-newest' : 'trace-tile'}
            style={{ background: colors[type] ?? '#c8c8c8' }}
            // The colour carries the identity for anyone who can see it; the
            // name is there for everyone else, so it is not decoration.
            data-tile={name}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}

export default TraceTicker;
