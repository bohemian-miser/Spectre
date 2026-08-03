/**
 * Beat 8 — "the matrix": the copy's table, live. One row per tile type, one
 * column per edge class, entries counted straight off the tile definitions.
 *
 * Click a column header to switch that class on; every row sums its selected
 * entries mod 2 in view, red for odd. A rule is good exactly when the whole
 * right-hand column reads zero — which is to say, when the rule is in the
 * kernel of this matrix over GF(2).
 */

import { useMemo, useState } from 'react';
import { edgeClassColor } from '../../lib/palette';
import {
  CLASSES,
  COUNT_MATRIX,
  maskLabel,
  maskOf,
  rowParity,
  setOf,
} from './presets';
import { Chip, FigureControls, Readout } from './Figure';
import { TileStrip } from './TileStrip';

const PRESETS: readonly { label: string; edges: readonly number[] }[] = [
  { label: '{5}', edges: [5] },
  { label: '{1, 5}', edges: [1, 5] },
  { label: '{2}', edges: [2] },
  { label: '{1, 2, 7, 8}', edges: [1, 2, 7, 8] },
];

export function MatrixExplorer(): JSX.Element {
  const [mask, setMask] = useState(maskOf([5]));
  const [hoverMajor, setHoverMajor] = useState<number | null>(null);

  const selected = useMemo(() => setOf(mask), [mask]);
  const highlight = useMemo(
    () => (hoverMajor === null ? undefined : new Set([hoverMajor])),
    [hoverMajor],
  );
  const parities = useMemo(
    () => COUNT_MATRIX.map((row) => rowParity(row, selected)),
    [selected],
  );
  const sadCount = parities.filter((p) => p === 1).length;

  return (
    <div className="tails-matrix">
      <FigureControls label="Matrix presets">
        {PRESETS.map((p) => (
          <Chip
            key={p.label}
            on={mask === maskOf(p.edges)}
            label={p.label}
            onClick={() => setMask(maskOf(p.edges))}
          />
        ))}
        <button type="button" className="tails-button" onClick={() => setMask(0)}>
          Clear
        </button>
      </FigureControls>

      <div className="tails-table-scroll">
        <table className="tails-table" data-mask={mask}>
          <caption className="muted">
            Seams per class, one count per handshake. Click a class to add it to the rule.
          </caption>
          <thead>
            <tr>
              <th scope="col">tile ↓ class →</th>
              {CLASSES.map((major) => (
                <th
                  key={major}
                  scope="col"
                  className={selected.has(major) ? 'is-selected' : ''}
                  style={{ borderBottomColor: edgeClassColor(major) }}
                >
                  <button
                    type="button"
                    aria-pressed={selected.has(major)}
                    onClick={() => setMask((m) => m ^ (1 << major))}
                    onPointerEnter={() => setHoverMajor(major)}
                    onPointerLeave={() => setHoverMajor(null)}
                    onFocus={() => setHoverMajor(major)}
                    onBlur={() => setHoverMajor(null)}
                  >
                    {major}
                  </button>
                </th>
              ))}
              <th scope="col">sum mod 2</th>
            </tr>
          </thead>
          <tbody>
            {COUNT_MATRIX.map((row, r) => (
              <tr key={row.type} className={parities[r] === 1 ? 'is-odd' : 'is-even'}>
                <th scope="row">{row.type}</th>
                {row.counts.map((n, c) => {
                  const major = CLASSES[c];
                  return (
                    <td
                      key={major}
                      className={[
                        selected.has(major) ? 'is-selected' : '',
                        hoverMajor === major ? 'is-hovered' : '',
                        n % 2 === 1 ? 'is-odd-entry' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {n}
                    </td>
                  );
                })}
                <td className={['tails-parity-cell', parities[r] === 1 ? 'is-odd' : 'is-even'].join(' ')}>
                  {parities[r]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tails-readouts">
        <Readout label="rule" value={<code>{maskLabel(mask)}</code>} />
        <Readout
          label="odd rows"
          value={sadCount}
          tone={mask === 0 ? 'neutral' : sadCount === 0 ? 'good' : 'bad'}
        />
        <Readout
          label="M x = 0 ?"
          value={mask === 0 ? 'trivially' : sadCount === 0 ? 'yes' : 'no'}
          tone={sadCount === 0 ? 'good' : 'bad'}
        />
      </div>

      <TileStrip selected={selected} highlightMajors={highlight} tileSize={92} />
      <p className="muted">
        Hover a column to light that class on every tile. The badges under each tile are the same
        numbers as the table — the drawing and the algebra are the same object.
      </p>
    </div>
  );
}

export default MatrixExplorer;
