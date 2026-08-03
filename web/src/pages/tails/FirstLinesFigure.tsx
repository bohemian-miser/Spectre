/**
 * Beat 4 — "first lines": pick one class, put a crossing on every seam of that
 * class, let each tile pair its crossings up, and watch the floor fill.
 *
 * Most tiles are perfectly happy — the inset shows one joining its two
 * crossings with a single chord. The trouble starts one beat later.
 */

import { useMemo, useState } from 'react';
import { TileView } from '../../components';
import { edgeClassColor } from '../../lib/palette';
import { FAMILY, crossingCount, pairableUnder } from './presets';
import { Chip, FigureControls, Readout } from './Figure';
import { PatchFigure } from './PatchFigure';

const CLASSES_ON_OFFER = [2, 1];

export function FirstLinesFigure(): JSX.Element {
  const [major, setMajor] = useState(2);
  const [level, setLevel] = useState(2);

  const subset = useMemo(() => [major], [major]);
  const selected = useMemo(() => new Set(subset), [subset]);
  const happy = useMemo(() => pairableUnder(major), [major]);

  return (
    <div className="tails-split is-wide-main">
      <div className="tails-split-main">
        <FigureControls label="Rule and patch size">
          {CLASSES_ON_OFFER.map((m) => (
            <Chip
              key={m}
              on={m === major}
              label={`class ${m} only`}
              swatch={edgeClassColor(m)}
              onClick={() => setMajor(m)}
            />
          ))}
          <span className="tails-stepper">
            <button
              type="button"
              aria-label="Smaller patch"
              disabled={level <= 1}
              onClick={() => setLevel((l) => Math.max(1, l - 1))}
            >
              −
            </button>
            <strong data-testid="first-lines-level">level {level}</strong>
            <button
              type="button"
              aria-label="Bigger patch"
              disabled={level >= 3}
              onClick={() => setLevel((l) => Math.min(3, l + 1))}
            >
              +
            </button>
          </span>
        </FigureControls>

        <PatchFigure
          idPrefix="tails-first"
          level={level}
          subset={subset}
          pannable
          showStats
          height={380}
          ariaLabel={`Level ${level} patch under class ${major} alone`}
        />
      </div>

      <aside className="tails-split-aside">
        <h4>{happy} is fine</h4>
        <TileView
          family={FAMILY}
          tileType={happy}
          size={170}
          selectedEdges={selected}
          matchingIndex={0}
          markOdd
          ariaLabel={`${happy} under class ${major}`}
        />
        <Readout label="crossings" value={crossingCount(happy, selected)} tone="good" />
        <p className="muted">
          Two crossings, one chord, no drama. Zoom into the patch and you can follow that chord out
          of {happy} and into whatever is next door.
        </p>
        <p className="muted">
          Wanderers at this size are mostly <em>edge of the floor</em>: the patch is finite, so
          lines that reach the boundary simply stop. The tails that matter are the ones stranded in
          the middle.
        </p>
      </aside>
    </div>
  );
}

export default FirstLinesFigure;
