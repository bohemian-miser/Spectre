/**
 * The rule lab — the single control surface at the top of the article.
 *
 * One piece of state (the selected classes) drives everything in view: the
 * class chips, the live count matrix with its mod-2 verdicts, and the full
 * cast of ten tiles. On the tiles every physical edge wears its major number,
 * faint until its class joins the rule; selected seams grow a crossing and
 * send a line in; lines pair up where they can and odd tiles leave a tail
 * hanging. Toggle a class anywhere — chip, matrix column, or the edge of a
 * tile — and every panel answers at once.
 *
 * Deliberately preset-free: the eight clean rules are the article's reveal,
 * and the lab must not spoil the puzzle console below it.
 */

import { useMemo, useState } from 'react';
import { EdgeClassLegend } from '../../components';
import { edgeClassColor } from '../../lib/palette';
import {
  CLASSES,
  COUNT_MATRIX,
  FAMILY,
  MATRIX_ROWS,
  maskLabel,
  maskOf,
  rowParity,
  setOf,
} from './presets';
import { FigureControls, Readout } from './Figure';
import { TileStrip } from './TileStrip';

/** Class 2 — the article's opening villain: most tiles pair up, Theta hangs. */
const INITIAL_MASK = maskOf([2]);

export function RuleLab(): JSX.Element {
  const [mask, setMask] = useState(INITIAL_MASK);
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
  const toggle = (major: number): void => setMask((m) => m ^ (1 << major));

  return (
    <div className="tails-lab">
      <FigureControls label="Rule controls">
        <EdgeClassLegend
          family={FAMILY}
          selected={selected}
          highlight={highlight}
          onToggle={toggle}
          onHover={setHoverMajor}
          legend="Switch classes on"
        />
        <button type="button" className="tails-button" onClick={() => setMask(0)}>
          Clear
        </button>
        <button
          type="button"
          className="tails-button"
          onClick={() => setMask(maskOf(CLASSES))}
          title="Every class at once"
        >
          All nine
        </button>
      </FigureControls>

      <div className="tails-lab-grid">
        <div className="tails-lab-matrix">
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
                        onClick={() => toggle(major)}
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
                    <td
                      className={[
                        'tails-parity-cell',
                        parities[r] === 1 ? 'is-odd' : 'is-even',
                      ].join(' ')}
                    >
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
              label="tiles with tails"
              value={`${sadCount} of ${MATRIX_ROWS.length}`}
              tone={mask === 0 ? 'neutral' : sadCount === 0 ? 'good' : 'bad'}
            />
            <Readout
              label="M x = 0 ?"
              value={mask === 0 ? 'trivially' : sadCount === 0 ? 'yes' : 'no'}
              tone={sadCount === 0 ? 'good' : 'bad'}
            />
          </div>
        </div>

        <div className="tails-lab-tiles">
          <TileStrip
            live
            selected={selected}
            highlightMajors={highlight}
            onToggleMajor={toggle}
            onHoverMajor={setHoverMajor}
            tileSize={140}
          />
        </div>
      </div>

      <p className="muted">
        Every edge wears its class number — faint until you switch that class on, anywhere: a chip,
        a matrix column, or the edge itself. Selected edges send a line into the tile; lines pair up
        where they can, and a tile with an odd count leaves one hanging. The badges under each tile
        are the same numbers as the table — the drawing and the algebra are the same object.
      </p>
    </div>
  );
}

export default RuleLab;
