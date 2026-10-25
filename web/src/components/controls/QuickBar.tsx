/**
 * `QuickBar` — the Explorer's quick controls under the field, ported from
 * aperiodic-circuits' explorer:
 *
 *  - a stepper through every whole-rule pairing, plus Random;
 *  - the edge classes as chips, with a dot that is green when the rule is
 *    tail-free; a selected class's `×n` button cycles its strands per seam
 *    (multi-edges), 1 → 2 → 3 → 1;
 *  - "groups": a basis of the tail-free rules (strand counts included). A
 *    group's chip XORs its classes in or out, so a tail-free rule stays
 *    tail-free, and it is lit when the current rule uses it;
 *  - one small picture per tile type with its current pairing: big tiles open
 *    the tile editor, small ones step to their next pairing.
 *
 * Fully controlled apart from two display preferences (tile size, groups
 * open), which are remembered per browser.
 */

import { useMemo, useState } from 'react';
import {
  MAX_STRANDS,
  connectionCount,
  familyMajors,
  leafOrder,
  strandCount,
  type EdgeContracts,
  type TileFamilyId,
  type TileTypeId,
} from '../../core';
import { comboOdometer } from '../../lib/comboOdometer';
import { edgeClassColor } from '../../lib/palette';
import { basisCoords, oddLeaves, parityBasis, xorGroup } from '../../lib/parityBasis';
import { TileGlyph } from '../TileGlyph';

export interface QuickBarProps {
  readonly family: TileFamilyId;
  readonly subset: readonly number[];
  readonly matching: readonly number[];
  readonly contracts?: EdgeContracts;
  readonly nonCrossingOnly?: boolean;
  readonly curvedStrands?: boolean;
  onToggleMajor(major: number): void;
  onSubsetChange(subset: readonly number[]): void;
  onStrands(major: number, count: number): void;
  onMatchingVectorChange(matching: readonly number[]): void;
  /** Step one tile's pairing (small tiles). */
  onCycleTile(type: TileTypeId, delta: 1 | -1): void;
  /** Open one tile in the editor (big tiles). */
  onOpenTile(type: TileTypeId): void;
}

const TILE_SIZES = ['big', 'small', 'off'] as const;

function useStoredNumber(key: string, fallback: number, ok: (n: number) => boolean): [number, (n: number) => void] {
  const [value, setValue] = useState(() => {
    try {
      const n = Number(localStorage.getItem(`quick:${key}`));
      return localStorage.getItem(`quick:${key}`) !== null && ok(n) ? n : fallback;
    } catch {
      return fallback;
    }
  });
  const set = (n: number) => {
    setValue(n);
    try {
      localStorage.setItem(`quick:${key}`, String(n));
    } catch {
      /* storage blocked: the choice lasts this visit */
    }
  };
  return [value, set];
}

/** Counts that won't fit the stepper shrink to "156T". */
function shortCount(n: number): string {
  return n < 100_000
    ? n.toLocaleString('en-US')
    : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function QuickBar(props: QuickBarProps): JSX.Element {
  const { family, subset, matching, contracts, nonCrossingOnly = false, curvedStrands = false } = props;
  const { onToggleMajor, onSubsetChange, onStrands, onMatchingVectorChange, onCycleTile, onOpenTile } = props;
  const [tileSize, setTileSize] = useStoredNumber('tile-size', 0, (n) => n === 0 || n === 1 || n === 2);
  const [basisOpen, setBasisOpen] = useStoredNumber('groups-open', 0, (n) => n === 0 || n === 1);

  const selected = useMemo(() => new Set(subset), [subset]);
  const classes = familyMajors(family);
  const order = leafOrder(family);
  const odometer = useMemo(
    () => comboOdometer(family, selected, matching, contracts, nonCrossingOnly),
    [family, selected, matching, contracts, nonCrossingOnly],
  );
  const odd = useMemo(() => oddLeaves(family, selected, contracts), [family, selected, contracts]);
  const pb = useMemo(() => parityBasis(family, contracts), [family, contracts]);
  const coords = useMemo(() => basisCoords(pb, subset), [pb, subset]);
  const tailFree = odd.length === 0;

  return (
    <div className="quick" data-testid="quick-bar">
      {odometer.total > 1 ? (
        <div className="quick-combo">
          <button type="button" aria-label="Previous pairing" onClick={() => onMatchingVectorChange(odometer.step(-1))}>
            ‹
          </button>
          <span
            className="quick-count"
            data-testid="quick-position"
            title={odometer.exact ? `Pairing ${(odometer.position + 1).toLocaleString('en-US')} of ${odometer.total.toLocaleString('en-US')}` : undefined}
          >
            Pairing
            <br />
            <b>{odometer.exact ? `${shortCount(odometer.position + 1)}/${shortCount(odometer.total)}` : 'many'}</b>
          </span>
          <button type="button" onClick={() => onMatchingVectorChange(odometer.step(1))}>
            Next pairing ›
          </button>
          <button type="button" className="primary" onClick={() => onMatchingVectorChange(odometer.random())}>
            Random
          </button>
        </div>
      ) : null}

      <div className="quick-edges" role="group" aria-label="Edge classes">
        <span className="quick-label">Edges</span>
        <span
          className={`quick-dot ${tailFree ? 'good' : 'bad'}`}
          data-testid="quick-tail-free"
          title={tailFree ? 'Tail-free: every tile has an even number of points' : `Odd number of points on ${odd.join(', ')}`}
        />
        {pb.basis.length > 0 ? (
          <button
            type="button"
            className={`quick-toggle${basisOpen ? ' on' : ''}`}
            aria-expanded={!!basisOpen}
            onClick={() => setBasisOpen(basisOpen ? 0 : 1)}
            title="Basis groups: flip a group's edges together and stay tail-free"
          >
            groups {basisOpen ? '▴' : '▾'}
          </button>
        ) : null}
        <button
          type="button"
          className="quick-size"
          onClick={() => setTileSize((tileSize + 1) % 3)}
          title={`Tile pictures: ${TILE_SIZES[tileSize]} (tap for ${TILE_SIZES[(tileSize + 1) % 3]})`}
          aria-label={`Tile pictures: ${TILE_SIZES[tileSize]}`}
        >
          <span className="long">Tiles: {TILE_SIZES[tileSize]}</span>
          <span className="short">⬡{['L', 'S', '–'][tileSize]}</span>
        </button>
        {classes.map((major) => {
          const on = selected.has(major);
          const n = strandCount(contracts, major);
          return (
            <span key={major} className={`quick-class${on ? ' is-on' : ''}`} style={{ ['--chip' as string]: edgeClassColor(major) }}>
              <button
                type="button"
                className={`chip${on ? ' on' : ''}`}
                data-major={major}
                aria-pressed={on}
                title={`Class ${major}${n > 1 ? `, ${n} strands per edge` : ''}`}
                onClick={() => onToggleMajor(major)}
              >
                {major === 7 ? '7M' : major}
                {n > 1 && !on ? <small>×{n}</small> : null}
              </button>
              {on ? (
                <button
                  type="button"
                  className={`quick-strands${n > 1 ? ' is-multi' : ''}`}
                  data-testid={`quick-strands-${major}`}
                  aria-label={`Class ${major}: ${n} strand${n === 1 ? '' : 's'} per edge (tap for ${(n % MAX_STRANDS) + 1})`}
                  title="Strands per edge: tap to change"
                  onClick={() => onStrands(major, (n % MAX_STRANDS) + 1)}
                >
                  ×{n}
                </button>
              ) : null}
            </span>
          );
        })}
      </div>

      {basisOpen && pb.basis.length > 0 ? (
        <div className="quick-basis" role="group" aria-label="Basis groups" data-testid="quick-basis">
          {pb.basis.map((g, i) => {
            const on = coords?.[i] ?? false;
            return (
              <button
                type="button"
                key={g.join(',')}
                className={`chip plain${on ? ' on' : ''}`}
                aria-pressed={on}
                title={`Flip classes ${g.join(', ')} together`}
                onClick={() => onSubsetChange(xorGroup(subset, g))}
              >
                {g.join('·')}
              </button>
            );
          })}
          <span className="quick-basis-count muted">
            {pb.count.toLocaleString('en-US')} tail-free rule{pb.count === 1 ? '' : 's'}
          </span>
        </div>
      ) : null}

      {tileSize < 2 ? (
        <div className={`quick-tiles${tileSize === 1 ? ' small' : ''}`} data-testid="quick-tiles">
          {order.map((type, i) => {
            const points = connectionCount(family, type, selected, contracts);
            const options = odometer.options[i];
            const choices = options.length;
            const isOdd = points % 2 === 1;
            const varies = !isOdd && choices > 1;
            const kind = isOdd ? 'odd' : points === 0 ? 'empty' : varies ? 'varies' : 'lines';
            const at = Math.max(0, options.indexOf(matching[i] ?? 0));
            const big = tileSize === 0;
            return (
              <button
                type="button"
                key={type}
                className={`quick-tile ${kind}`}
                data-tile={type}
                disabled={!big && !varies}
                title={big ? `${type}: tap to edit its edges and pairing` : varies ? `${type}: tap for its next pairing` : type}
                onClick={() => (big ? onOpenTile(type) : onCycleTile(type, 1))}
              >
                <TileGlyph
                  family={family}
                  type={type}
                  selected={selected}
                  contracts={contracts}
                  index={matching[i] ?? 0}
                  curvedStrands={curvedStrands}
                  size={big ? 56 : 34}
                />
                <span className="quick-tile-name">{type}</span>
                {isOdd || varies ? (
                  <span className="quick-tile-ctl">{isOdd ? 'odd' : `${at + 1}/${choices}`}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default QuickBar;
